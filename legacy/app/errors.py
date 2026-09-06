"""Error handlers for the application."""

from flask import render_template, request, jsonify
from werkzeug.exceptions import HTTPException


def register_error_handlers(app):
    """Register error handlers with the Flask app."""
    
    @app.errorhandler(404)
    def not_found_error(error):
        """Handle 404 errors."""
        if request.is_json:
            return jsonify({'error': 'Siden blev ikke fundet'}), 404
        return render_template('errors/404.html'), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        """Handle 500 errors."""
        if request.is_json:
            return jsonify({'error': 'Der opstod en intern serverfejl'}), 500
        return render_template('errors/500.html'), 500
    
    @app.errorhandler(403)
    def forbidden_error(error):
        """Handle 403 errors."""
        if request.is_json:
            return jsonify({'error': 'Adgang nægtet'}), 403
        return render_template('errors/403.html'), 403
    
    @app.errorhandler(400)
    def bad_request_error(error):
        """Handle 400 errors."""
        if request.is_json:
            return jsonify({'error': 'Ugyldig anmodning'}), 400
        return render_template('errors/400.html'), 400
    
    @app.errorhandler(HTTPException)
    def handle_http_exception(error):
        """Handle general HTTP exceptions."""
        if request.is_json:
            return jsonify({'error': error.description}), error.code
        return render_template(f'errors/{error.code}.html'), error.code

