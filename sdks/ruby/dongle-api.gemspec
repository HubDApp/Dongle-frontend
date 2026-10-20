# frozen_string_literal: true

Gem::Specification.new do |spec|
  spec.name          = 'dongle-api'
  spec.version       = '1.0.0'
  spec.authors       = ['Dongle Team']
  spec.email         = ['team@dongle.example.com']

  spec.summary       = 'Ruby SDK for Dongle Form API'
  spec.description   = 'Official Ruby client library for the Dongle form submission API'
  spec.homepage      = 'https://github.com/dongle/ruby-sdk'
  spec.license       = 'MIT'
  spec.required_ruby_version = '>= 2.7.0'

  spec.files = Dir['lib/**/*', 'README.md']
  spec.require_paths = ['lib']
end
