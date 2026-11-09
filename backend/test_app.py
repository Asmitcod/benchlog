import unittest

from app import create_app


class HealthEndpointTests(unittest.TestCase):
    def setUp(self):
        self.client = create_app().test_client()

    def test_health_endpoint_reports_service_status(self):
        response = self.client.get("/healthz")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.get_json(),
            {"status": "ok", "service": "benchlog-api"},
        )
