"""
Python client for Dongle Form API
"""

import requests
from typing import Optional, Dict, Any
from .types import SubmissionData, ReviewData, ApiResponse, PaginationParams, FilterParams


class FormApiError(Exception):
    """Custom exception for API errors"""
    def __init__(self, message: str, status_code: Optional[int] = None, code: Optional[str] = None):
        super().__init__(message)
        self.status_code = status_code
        self.code = code


class FormApiClient:
    """Client for interacting with Dongle Form API"""
    
    def __init__(self, base_url: str, api_key: Optional[str] = None, timeout: int = 30):
        """
        Initialize the API client
        
        Args:
            base_url: Base URL of the API
            api_key: Optional API key for authentication
            timeout: Request timeout in seconds (default: 30)
        """
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.timeout = timeout
        self.session = requests.Session()
        
        if api_key:
            self.session.headers.update({'Authorization': f'Bearer {api_key}'})
        self.session.headers.update({'Content-Type': 'application/json'})
    
    def _request(self, method: str, endpoint: str, **kwargs) -> ApiResponse:
        """Make HTTP request to API"""
        url = f"{self.base_url}{endpoint}"
        
        try:
            response = self.session.request(
                method,
                url,
                timeout=self.timeout,
                **kwargs
            )
            
            data = response.json()
            
            if not response.ok:
                raise FormApiError(
                    data.get('error', 'Request failed'),
                    response.status_code,
                    data.get('code')
                )
            
            return data
        except requests.RequestException as e:
            raise FormApiError(str(e))
    
    # Submission methods
    def create_submission(self, data: SubmissionData) -> ApiResponse:
        """Create a new submission"""
        return self._request('POST', '/api/submissions', json=data)
    
    def get_submissions(self, params: Optional[Dict[str, Any]] = None) -> ApiResponse:
        """Get list of submissions with optional filters"""
        return self._request('GET', '/api/submissions', params=params)
    
    def get_submission(self, submission_id: str) -> ApiResponse:
        """Get a single submission by ID"""
        return self._request('GET', f'/api/submissions/{submission_id}')
    
    def update_submission(self, submission_id: str, data: Dict[str, Any]) -> ApiResponse:
        """Update a submission"""
        return self._request('PATCH', f'/api/submissions/{submission_id}', json=data)
    
    def delete_submission(self, submission_id: str) -> ApiResponse:
        """Delete a submission"""
        return self._request('DELETE', f'/api/submissions/{submission_id}')
    
    # Review methods
    def create_review(self, data: ReviewData) -> ApiResponse:
        """Create a new review"""
        return self._request('POST', '/api/reviews', json=data)
    
    def get_reviews(self, params: Optional[Dict[str, Any]] = None) -> ApiResponse:
        """Get list of reviews with optional filters"""
        return self._request('GET', '/api/reviews', params=params)
    
    def get_review(self, review_id: str) -> ApiResponse:
        """Get a single review by ID"""
        return self._request('GET', f'/api/reviews/{review_id}')
    
    def __enter__(self):
        """Context manager entry"""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.session.close()
