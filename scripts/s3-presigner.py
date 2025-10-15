#!/usr/bin/env python3
"""
Local server to download S3 file content directly.
This server accepts S3 URLs and returns the file content directly instead of presigned URLs.
"""

import argparse
import base64
import json
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
import datetime
import time


class S3PresignerHandler(BaseHTTPRequestHandler):
    def log_request_response(self, method, request_data=None, response_data=None, status_code=200, error=None):
        """Log request and response with timestamp"""
        timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        client_ip = self.client_address[0]
        
        print(f"\n{'='*80}")
        print(f"[{timestamp}] {method} Request from {client_ip}")
        print(f"Path: {self.path}")
        
        # Log request headers
        print(f"Headers:")
        for header, value in self.headers.items():
            print(f"  {header}: {value}")
        
        # Log request data
        if request_data:
            print(f"Request Body:")
            if isinstance(request_data, dict):
                print(f"  {json.dumps(request_data, indent=2)}")
            else:
                print(f"  {request_data}")
        
        # Log response
        print(f"Response Status: {status_code}")
        if response_data:
            print(f"Response Body:")
            if isinstance(response_data, dict):
                print(f"  {json.dumps(response_data, indent=2)}")
            else:
                print(f"  {response_data}")
        
        if error:
            print(f"Error: {error}")
        
        print(f"{'='*80}\n")

    def log_request_response_debug(self, method, request_data=None, response_data=None, status_code=200, error=None, raw_data=None):
        """Enhanced debug logging with raw data"""
        timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        client_ip = self.client_address[0]
        
        print(f"\n{'='*80}")
        print(f"[{timestamp}] {method} Request from {client_ip}")
        print(f"Path: {self.path}")
        
        # Log request headers
        print(f"Headers:")
        for header, value in self.headers.items():
            print(f"  {header}: {value}")
        
        # Log raw data if available
        if raw_data is not None:
            print(f"Raw Request Data ({len(raw_data)} bytes):")
            print(f"  Hex: {raw_data.hex()}")
            print(f"  ASCII: {repr(raw_data)}")
            try:
                decoded = raw_data.decode('utf-8')
                print(f"  UTF-8: '{decoded}'")
            except UnicodeDecodeError:
                print(f"  UTF-8: <decode error>")
        
        # Log parsed request data
        if request_data:
            print(f"Parsed Request Data:")
            if isinstance(request_data, dict):
                print(f"  {json.dumps(request_data, indent=2)}")
            else:
                print(f"  {request_data}")
        
        # Log response
        print(f"Response Status: {status_code}")
        if response_data:
            print(f"Response Body:")
            if isinstance(response_data, dict):
                print(f"  {json.dumps(response_data, indent=2)}")
            else:
                print(f"  {response_data}")
        
        if error:
            print(f"Error: {error}")
        
        print(f"{'='*80}\n")

    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.log_request_response('OPTIONS', status_code=200)
        
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        """Handle GET requests with URL parameter"""
        start_time = time.time()
        request_data = None
        response_data = None
        status_code = 200
        error = None
        
        try:
            # Parse the query parameters
            parsed_url = urlparse(self.path)
            query_params = parse_qs(parsed_url.query)
            request_data = dict(query_params)
            
            # Enable CORS
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

            if 'url' not in query_params:
                response_data = {
                    'error': 'Missing url parameter',
                    'usage': 'GET /?url=https://fleetdata-production.s3.amazonaws.com/...'
                }
                error = 'Missing url parameter'
                self.wfile.write(json.dumps(response_data).encode())
                return

            s3_url = query_params['url'][0]
            file_data = self.download_file_content_from_s3_url(s3_url)
            
            response_data = {
                'original_url': s3_url,
                'content': file_data['content'],
                'is_binary': file_data['is_binary'],
                'size_bytes': file_data['size_bytes'],
                'content_type': file_data['content_type'],
                'last_modified': file_data['last_modified'],
                'etag': file_data['etag'],
                'status': 'success',
                'processing_time_ms': round((time.time() - start_time) * 1000, 2)
            }
            
            self.wfile.write(json.dumps(response_data, indent=2).encode())
            
        except Exception as e:
            status_code = 500
            error = str(e)
            
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response_data = {
                'error': str(e),
                'status': 'error',
                'processing_time_ms': round((time.time() - start_time) * 1000, 2)
            }
            self.wfile.write(json.dumps(response_data).encode())
        
        finally:
            self.log_request_response('GET', request_data, response_data, status_code, error)

    def do_POST(self):
        """Handle POST requests with JSON body"""
        start_time = time.time()
        request_data = None
        response_data = None
        status_code = 200
        error = None
        raw_post_data = None
        
        try:
            # Enable CORS
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

            # Read the request body
            content_length = int(self.headers['Content-Length'])
            raw_post_data = self.rfile.read(content_length)
            
            print(f"Raw POST data ({content_length} bytes): {raw_post_data}")
            
            # Parse JSON
            try:
                request_data = json.loads(raw_post_data.decode('utf-8'))
                print(f"Parsed JSON successfully: {request_data}")
            except json.JSONDecodeError as e:
                response_data = {
                    'error': 'Invalid JSON in request body',
                    'details': str(e),
                    'raw_data': raw_post_data.decode('utf-8', errors='ignore')
                }
                error = f'JSON decode error: {e}'
                self.wfile.write(json.dumps(response_data).encode())
                return

            if 'url' not in request_data:
                response_data = {
                    'error': 'Missing url in JSON body',
                    'usage': 'POST with JSON: {"url": "https://fleetdata-production.s3.amazonaws.com/..."}',
                    'received_data': request_data
                }
                error = 'Missing url in request body'
                self.wfile.write(json.dumps(response_data).encode())
                return

            s3_url = request_data['url']
            
            file_data = self.download_file_content_from_s3_url(s3_url)
            
            response_data = {
                'original_url': s3_url,
                'content': file_data['content'],
                'is_binary': file_data['is_binary'],
                'size_bytes': file_data['size_bytes'],
                'content_type': file_data['content_type'],
                'last_modified': file_data['last_modified'],
                'etag': file_data['etag'],
                'status': 'success',
                'processing_time_ms': round((time.time() - start_time) * 1000, 2)
            }
            
            self.wfile.write(json.dumps(response_data, indent=2).encode())
            
        except Exception as e:
            status_code = 500
            error = str(e)
            
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response_data = {
                'error': str(e),
                'status': 'error',
                'processing_time_ms': round((time.time() - start_time) * 1000, 2)
            }
            self.wfile.write(json.dumps(response_data).encode())
        
        finally:
            # Enhanced logging for debugging
            self.log_request_response_debug('POST', request_data, response_data, status_code, error, raw_post_data)

    def download_file_content_from_s3_url(self, s3_url):
        """
        Download file content directly from S3 URL
        
        :param s3_url: The S3 URL (e.g., https://fleetdata-production.s3.amazonaws.com/path/to/file.txt)
        :return: Dictionary containing file content and metadata
        """
        start_time = time.time()
        # s3://nd-training-data-production/N406028947655666/071f10b5-bb33-4fbc-9cae-9cb70bab94e8/metadata.txt
        if s3_url.startswith('s3://'):
            s3_url = s3_url.replace('s3://',"https://s3.amazonaws.com/")
        try:
            # Parse the S3 URL to extract bucket and key
            parsed = urlparse(s3_url)
            
            # Handle different S3 URL formats
            if '.s3.amazonaws.com' in parsed.netloc:
                # Format: https://bucket-name.s3.amazonaws.com/key
                bucket = parsed.netloc.split('.s3.amazonaws.com')[0]
                key = parsed.path.lstrip('/')
            elif parsed.netloc == 's3.amazonaws.com':
                # Format: https://s3.amazonaws.com/bucket-name/key
                path_parts = parsed.path.lstrip('/').split('/', 1)
                bucket = path_parts[0]
                key = path_parts[1] if len(path_parts) > 1 else ''
            
            # elif parsed.scheme == "s3":
            #     #for the format s3://nd-training-data-production/ee6525a9-be5f-4ad1-86d3-2a7ad03b8772/metadata.txt
            #     # ParseResult(scheme='s3', netloc='nd-training-data-production', path='/ee6525a9-be5f-4ad1-86d3-2a7ad03b8772/metadata.txt', params='', query='', fragment='')
            #     bucket = parsed.netloc
            #     key = parsed.path

            #     if key[0] == "/":
            #         key = key[1:]

            else:
                raise ValueError(f"Unrecognized S3 URL format: {s3_url}")

            if not bucket or not key:
                raise ValueError(f"Could not extract bucket and key from URL: {s3_url}")

            parse_time = time.time()
            print(f"URL parsing completed in {round((parse_time - start_time) * 1000, 2)}ms")
            print(f"Downloading file content for bucket='{bucket}', key='{key}'")

            # Create S3 client (uses AWS credentials from environment/config)
            s3_client = boto3.client('s3')
            
            # Download file content
            response = s3_client.get_object(Bucket=bucket, Key=key)
            file_content = response['Body'].read()
            
            # Try to decode as text, fallback to base64 if binary
            try:
                content_text = file_content.decode('utf-8')
                is_binary = False
            except UnicodeDecodeError:
                content_text = base64.b64encode(file_content).decode('utf-8')
                is_binary = True
            
            total_time = time.time()
            print(f"Successfully downloaded file content in {round((total_time - start_time) * 1000, 2)}ms")
            
            return {
                'content': content_text,
                'is_binary': is_binary,
                'size_bytes': len(file_content),
                'content_type': response.get('ContentType', 'application/octet-stream'),
                'last_modified': response.get('LastModified').isoformat() if response.get('LastModified') else None,
                'etag': response.get('ETag', '').strip('"')
            }
            
        except NoCredentialsError:
            raise Exception("AWS credentials not found. Please configure your AWS credentials.")
        except ClientError as e:
            raise Exception(f"AWS client error: {e}")
        except Exception as e:
            raise Exception(f"Error generating presigned URL: {e}")

    def log_message(self, format, *args):
        """Override to customize logging - suppress default HTTP logging since we have detailed logging"""
        # We suppress the default HTTP request logging since we have our own detailed logging
        pass


def main():
    parser = argparse.ArgumentParser(description='S3 File Content Downloader Local Server')
    parser.add_argument('--port', type=int, default=8080, help='Port to run the server on (default: 8080)')
    parser.add_argument('--host', default='localhost', help='Host to bind to (default: localhost)')
    
    args = parser.parse_args()
    
    # Test AWS credentials
    try:
        s3_client = boto3.client('s3')
        s3_client.list_buckets()  # Simple test to verify credentials
        print("✅ AWS credentials verified")
    except NoCredentialsError:
        print("❌ AWS credentials not found!")
        print("Please configure your AWS credentials using one of these methods:")
        print("1. AWS CLI: aws configure")
        print("2. Environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN")
        print("3. AWS credentials file: ~/.aws/credentials")
        return 1
    except Exception as e:
        print(f"❌ AWS credentials test failed: {e}")
        return 1

    # Start the server
    server_address = (args.host, args.port)
    httpd = HTTPServer(server_address, S3PresignerHandler)
    
    print(f"🚀 S3 File Content Downloader Server starting on http://{args.host}:{args.port}")
    print(f"📋 Usage:")
    print(f"   GET:  http://{args.host}:{args.port}/?url=https://fleetdata-production.s3.amazonaws.com/path/file.txt")
    print(f"   POST: http://{args.host}:{args.port}/ with JSON body: {{\"url\": \"https://...\"}}")
    print(f"💡 Press Ctrl+C to stop")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped")
        httpd.server_close()
        return 0


if __name__ == "__main__":
    exit(main())
