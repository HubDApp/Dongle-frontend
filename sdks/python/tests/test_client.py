"""
Tests for FormApiClient
"""

import pytest
from unittest.mock import Mock, patch
from dongle_api import FormApiClient, FormApiError


class TestFormApiClient:
    def setup_method(self):
        self.client = FormApiClient(
            base_url='https://api.test.com',
            api_key='test-key'
        )

    def test_init(self):
        assert self.client.base_url == 'https://api.test.com'
        assert self.client.api_key == 'test-key'
        assert self.client.timeout == 30

    @patch('dongle_api.client.requests.Session.request')
    def test_create_submission_success(self, mock_request):
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = {
            'success': True,
            'data': {'id': '123'}
        }
        mock_request.return_value = mock_response

        result = self.client.create_submission({
            'projectName': 'Test',
            'category': 'defi',
            'description': 'Test description'
        })

        assert result['success'] is True
        assert result['data']['id'] == '123'

    @patch('dongle_api.client.requests.Session.request')
    def test_create_submission_error(self, mock_request):
        mock_response = Mock()
        mock_response.ok = False
        mock_response.code = 400
        mock_response.json.return_value = {'error': 'Bad request'}
        mock_request.return_value = mock_response

        with pytest.raises(FormApiError) as exc_info:
            self.client.create_submission({
                'projectName': 'Test',
                'category': 'defi',
                'description': 'Test'
            })

        assert 'Bad request' in str(exc_info.value)

    def test_context_manager(self):
        with FormApiClient(base_url='https://api.test.com') as client:
            assert client is not None
