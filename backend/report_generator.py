#control layer report generator - make report and read telem readings and alerts
#activated by telemproc when alert confirmed


import logging
import os
from datetime import datetime, timedelta
from dataclasses import dataclass
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


@dataclass
class ReportData: #struct data returned to FE
    report_id: str
    generated_at: str
    metric_type: str
    zone: str
    alert_count: int
    critical_count: int
    high_count: int
    data_points: list= None  #includes [tiemstamp, val]
    summary: str = ""

    def to_dict(self) -> dict:
        return {
            "report_id": self.report_id,
            "generated_at": self.generated_at,
            "metric_type": self.metric_type,
            "zone": self.zone,
            "alert_count": self.alert_count,
            "critical_count": self.critical_count,
            "high_count": self.high_count,
            "data_points": self.data_points or [],
            "summary": self.summary,
        }

class ReportGenerator: #control layter manages report table
    def __init__(self) -> None:
        self._supabase: Client =create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        )

    def generate_report(
        self, metric_type: str, zone: str, hours: int = 24
    ) -> ReportData:
        #generate report and query telem
        try:
            # repository pattern - directly query telemetry
            cutoff_time = (datetime.utcnow() - timedelta(hours=hours)).isoformat()
            telemetry_response = (
                self._supabase.table("telemetry_readings")
                .select("*")
                .eq("metric_type", metric_type)
                .eq("zone_id", zone)
                .gte("timestamp", cutoff_time)
                .order("timestamp", desc=False)
                .execute()
            )
            telemetry_data = telemetry_response.data or []

            # repo pattern - direct query assoc. alerts
            alerts_response = (
                self._supabase.table("alerts")
                .select("*, alert_rules(metric_type)")
                .eq("alert_rules.metric_type", metric_type)
                .gte("triggered_at", cutoff_time)
                .execute()
            )
            alerts = alerts_response.data or []
            alert_count = len(alerts)
            critical_count = sum(1 for a in alerts if a.get("severity") == "critical")
            high_count = sum(1 for a in alerts if a.get("severity") == "high")
            #get data poinnts
            data_points = [
                (reading["timestamp"], reading["value"])
                for reading in telemetry_data
            ]
            summary = (
                f"Report for {metric_type} in {zone}: "
                f"{len(telemetry_data)} readings, {alert_count} alerts "
                f"({critical_count} critical, {high_count} high)"
            )

            #reportdata obj
            report_id = f"report_{datetime.utcnow().timestamp()}"
            report = ReportData(
                report_id=report_id,
                generated_at=datetime.utcnow().isoformat() + "Z",
                metric_type=metric_type,
                zone=zone,
                alert_count=alert_count,
                critical_count=critical_count,
                high_count=high_count,
                data_points=data_points,
                summary=summary,
            )
            #reports table
            self._supabase.table("reports").insert(report.to_dict()).execute()
            logger.info(f"[ReportGenerator] Generated report: {report_id}")
            return report
        except Exception as exc:
            logger.error(f"[ReportGenerator] Failed to generate report: {exc}")
            return None
    def get_recent_reports(self, limit: int = 10) -> list:
        """Retrieve recent reports from the reports table."""
        try:
            response = (
                self._supabase.table("reports")
                .select("*")
                .order("generated_at", desc=True)
                .limit(limit)
                .execute()
            )
            logger.info(
                f"[ReportGenerator] Retrieved {len(response.data)} recent reports"
            )
            return response.data
        except Exception as exc:
            logger.error(f"[ReportGenerator] Failed to retrieve reports: {exc}")
            return []
