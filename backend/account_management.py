# control layer - accoutn managemtnt (note doesnt handle user creation)
# called by accountmanangement api endpoint, calls auditlogger for role audit logging
import logging
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


class AccountManagement: # manage user roles/perms
    def __init__(self, audit_logger=None) -> None:
        self._supabase: Client = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        )
        self._audit_logger = audit_logger

    def assign_role(self, user_id: str, role: str) -> bool:
#give role to user ebfore adding to table
        try:
            #validate
            valid_roles = [
                "system_admin",
                "city_operator",
                "government_official",
                "emergency_services",
            ]
            if role not in valid_roles:
                logger.error(f"[AccountManagement] Invalid role: {role}")
                return False
#log
            if self._audit_logger:
                new_val = {"user_id": user_id, "role": role}
                self._audit_logger.log_account_event(
                    user_id=user_id,
                    action="INSERT",
                    table_name="user_roles",
                    new_val=new_val,
                )
            logger.info(
                f"[AccountManagement] Role {role} assigned to user {user_id}"
            )
            return True
        except Exception as exc:
            logger.error(f"[AccountManagement] Failed to assign role: {exc}")
            return False

    def update_role(self, user_id: str, old_role: str, new_role: str) -> bool:
        try: # note same struct as above
            valid_roles = [
                "system_admin",
                "city_operator",
                "government_official",
                "emergency_services",
            ]
            if new_role not in valid_roles:
                logger.error(f"[AccountManagement] Invalid role: {new_role}")
                return False
            if self._audit_logger:
                old_val = {"user_id": user_id, "role": old_role}
                new_val = {"user_id": user_id, "role": new_role}
                self._audit_logger.log_account_event(
                    user_id=user_id,
                    action="UPDATE",
                    table_name="user_roles",
                    old_val=old_val,
                    new_val=new_val,
                )
            logger.info(
                f"[AccountManagement] Role updated for user {user_id}: {old_role} → {new_role}"
            )
            return True
        except Exception as exc:
            logger.error(f"[AccountManagement] Failed to update role: {exc}")
            return False

    def remove_user(self, user_id: str) -> bool:
        try:
            if self._audit_logger:
                self._audit_logger.log_account_event(
                    user_id=user_id,
                    action="DELETE",
                    table_name="user_roles",
                    old_val={"user_id": user_id},
                )

            logger.info(f"[AccountManagement] User {user_id} removed")
            return True
        except Exception as exc:
            logger.error(f"[AccountManagement] Failed to remove user: {exc}")
            return False
