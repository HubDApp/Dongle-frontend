# frozen_string_literal: true

require 'net/http'
require 'json'
require 'uri'

module Dongle
  class APIError < StandardError
    attr_reader :status_code, :code

    def initialize(message, status_code = nil, code = nil)
      super(message)
      @status_code = status_code
      @code = code
    end
  end

  class Client
    attr_reader :base_url, :api_key, :timeout

    def initialize(base_url:, api_key: nil, timeout: 30)
      @base_url = base_url.chomp('/')
      @api_key = api_key
      @timeout = timeout
    end

    def create_submission(data)
      request(:post, '/api/submissions', data)
    end

    def get_submissions(params = {})
      request(:get, '/api/submissions', nil, params)
    end

    def create_review(data)
      request(:post, '/api/reviews', data)
    end

    def get_reviews(params = {})
      request(:get, '/api/reviews', nil, params)
    end

    private

    def request(method, endpoint, body = nil, params = {})
      uri = URI("#{@base_url}#{endpoint}")
      uri.query = URI.encode_www_form(params) unless params.empty?

      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = uri.scheme == 'https'
      http.read_timeout = @timeout

      request_class = case method
                      when :get then Net::HTTP::Get
                      when :post then Net::HTTP::Post
                      when :patch then Net::HTTP::Patch
                      when :delete then Net::HTTP::Delete
                      end

      request = request_class.new(uri)
      request['Content-Type'] = 'application/json'
      request['Authorization'] = "Bearer #{@api_key}" if @api_key
      request.body = body.to_json if body

      response = http.request(request)
      data = JSON.parse(response.body, symbolize_names: true)

      unless response.is_a?(Net::HTTPSuccess)
        raise APIError.new(
          data[:error] || 'Request failed',
          response.code.to_i,
          data[:code]
        )
      end

      data
    rescue JSON::ParserError => e
      raise APIError.new("Invalid JSON response: #{e.message}")
    rescue StandardError => e
      raise APIError.new(e.message)
    end
  end
end
