# frozen_string_literal: true

require 'rspec'
require_relative '../lib/dongle'

RSpec.describe Dongle::Client do
  let(:client) do
    Dongle::Client.new(
      base_url: 'https://api.test.com',
      api_key: 'test-key'
    )
  end

  describe '#initialize' do
    it 'sets base_url' do
      expect(client.base_url).to eq('https://api.test.com')
    end

    it 'sets api_key' do
      expect(client.api_key).to eq('test-key')
    end

    it 'sets default timeout' do
      expect(client.timeout).to eq(30)
    end
  end

  describe '#create_submission' do
    it 'makes POST request to /api/submissions' do
      stub_request = stub_request(:post, 'https://api.test.com/api/submissions')
        .to_return(
          status: 200,
          body: { success: true, data: { id: '123' } }.to_json,
          headers: { 'Content-Type' => 'application/json' }
        )

      result = client.create_submission(
        project_name: 'Test',
        category: 'defi',
        description: 'Test description'
      )

      expect(result[:success]).to be true
      expect(result[:data][:id]).to eq('123')
    end
  end

  describe 'error handling' do
    it 'raises APIError on failed request' do
      stub_request(:post, 'https://api.test.com/api/submissions')
        .to_return(
          status: 400,
          body: { error: 'Bad request' }.to_json,
          headers: { 'Content-Type' => 'application/json' }
        )

      expect do
        client.create_submission(
          project_name: 'Test',
          category: 'defi',
          description: 'Test'
        )
      end.to raise_error(Dongle::APIError, /Bad request/)
    end
  end
end
