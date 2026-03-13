"""
Console API endpoints - view and clear server logs
"""
from flask import jsonify
import console_logger


def register_console_routes(app):
    """Register all console-related API routes"""
    
    @app.route("/api/console/logs", methods=["GET"])
    def get_console_logs():
        """Return all captured console logs"""
        return jsonify({"logs": console_logger.get_console_logs()})
    
    
    @app.route("/api/console/clear", methods=["POST"])
    def clear_console_logs():
        """Clear all console logs"""
        console_logger.clear_console_logs()
        return jsonify({"status": "cleared"})
