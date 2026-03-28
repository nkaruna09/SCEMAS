import { useEffect, useState } from 'react';

function GraphDisplay() {
  const [graphUrls, setGraphUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGraphs();
  }, []);

  const fetchGraphs = async () => {
    try {
      setLoading(true);

      // Example sensor data (replace with actual data from your backend)
      const sensors = ['sensor1', 'sensor2', 'sensor3'];

      const graphPromises = sensors.map(async (sensorId) => {
        const response = await fetch(`http://127.0.0.1:8000/generate-graph/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sensor_id: sensorId,
            data: [
              { x: 1, y: Math.random() * 100 },
              { x: 2, y: Math.random() * 100 },
              { x: 3, y: Math.random() * 100 },
            ],
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch graph for ${sensorId}`);
        }

        const blob = await response.blob();
        return URL.createObjectURL(blob);
      });

      const urls = await Promise.all(graphPromises);
      setGraphUrls(urls);
    } catch (error) {
      console.error('Error fetching graphs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p className="text-gray-500">Loading graphs...</p>;
  }

  if (graphUrls.length === 0) {
    return <p className="text-gray-500">No graphs available.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {graphUrls.map((url, index) => (
        <img
          key={index}
          src={url}
          alt={`Graph ${index + 1}`}
          className="rounded-lg shadow-md"
        />
      ))}
    </div>
  );
}