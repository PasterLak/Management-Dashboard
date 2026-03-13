"""
Simulator API endpoints - start, stop, and manage virtual devices
"""
from flask import request, jsonify
import simulator_manager


def register_simulator_routes(app):
    """Register all simulator-related API routes"""
    
    @app.route("/api/simulator/start", methods=["POST"])
    def start_simulator():
        """Start a new simulator"""
        data = request.json or {}
        sim_id = data.get("id")
        interval = data.get("interval", 1000)
        payload = data.get("payload", "{}")
        auto_update = data.get("autoUpdate", True)
        max_responses = data.get("maxResponses", 100)
        
        result, status = simulator_manager.start_simulator(
            app, sim_id, interval, payload, auto_update, max_responses
        )
        return jsonify(result), status
    
    
    @app.route("/api/simulator/stop", methods=["POST"])
    def stop_simulator():
        """Stop a running simulator"""
        data = request.json or {}
        sim_id = data.get("id")
        
        result, status = simulator_manager.stop_simulator(sim_id)
        return jsonify(result), status
    
    
    @app.route("/api/simulator/status/<int:sim_id>", methods=["GET"])
    def get_simulator_status(sim_id):
        """Get status and responses for a simulator"""
        result, status = simulator_manager.get_simulator_status(sim_id)
        return jsonify(result), status
    
    
    @app.route("/api/simulator/update", methods=["POST"])
    def update_simulator():
        """Update simulator settings"""
        data = request.json or {}
        sim_id = data.get("id")
        auto_update = data.get("autoUpdate")
        
        result, status = simulator_manager.update_simulator_config(sim_id, auto_update)
        return jsonify(result), status
    
    
    @app.route("/api/simulator/update_payload", methods=["POST"])
    def update_simulator_payload():
        """Update simulator payload when approving changes"""
        data = request.json or {}
        sim_id = data.get("id")
        payload_str = data.get("payload", "{}")
        
        result, status = simulator_manager.update_simulator_payload(sim_id, payload_str, app)
        return jsonify(result), status
    
    
    @app.route("/api/simulator/send", methods=["POST"])
    def send_simulator_once():
        """Send a single payload once"""
        data = request.json or {}
        sim_id = data.get("id")
        payload_str = data.get("payload", "{}")
        
        result, status = simulator_manager.send_payload_once(app, sim_id, payload_str)
        return jsonify(result), status
    
    
    @app.route("/api/simulator/clear", methods=["POST"])
    def clear_simulator_responses():
        """Clear simulator console output"""
        data = request.json or {}
        sim_id = data.get("id")
        
        result, status = simulator_manager.clear_simulator_responses(sim_id)
        return jsonify(result), status
    
    
    @app.route("/api/simulator/delete", methods=["POST"])
    def delete_simulator_responses():
        """Delete simulator responses when removed"""
        data = request.json or {}
        sim_id = data.get("id")
        
        result, status = simulator_manager.delete_simulator_responses(sim_id)
        return jsonify(result), status
