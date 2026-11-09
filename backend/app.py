from flask import Flask, jsonify


def create_app():
    app = Flask(__name__)

    @app.get("/healthz")
    def health():
        return jsonify({"status": "ok", "service": "benchlog-api"})

    return app
