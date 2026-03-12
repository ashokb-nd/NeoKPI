#!/usr/bin/env python3
"""
Local server to download S3 file content directly.
This server accepts S3 URLs and returns the file content directly instead of presigned URLs.
Supports local storage caching with neokpi_storage folder.
"""

import argparse
import base64
import json
import os
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
import datetime
import time

def custom_metadata_location(alert_id):
    custom_path = None
    #logic here
    # custom_path = f"/custom/path/for/{alert_id}/summary.json"



    # check if path exists else return None
    if custom_path and os.path.exists(custom_path):
        return custom_path
    return None

class S3PresignerHandler(BaseHTTPRequestHandler):
    # Storage directory for metadata files (relative to script location)
    STORAGE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "neokpi_storage")
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
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
        # if response_data:
        #     print(f"Response Body:")
        #     if isinstance(response_data, dict):
        #         # Create a copy without sensitive content for logging
        #         log_data = response_data.copy()
        #         if 'content' in log_data and len(log_data['content']) > 100:
        #             log_data['content'] = f"<content truncated - {len(log_data['content'])} chars>"
        #         print(f"  {json.dumps(log_data, indent=2)}")
        #     else:
        #         print(f"  {response_data}")
        
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
        # if response_data:
        #     print(f"Response Body:")
        #     if isinstance(response_data, dict):
        #         # Create a copy without sensitive content for logging
        #         log_data = response_data.copy()
        #         if 'content' in log_data and len(log_data['content']) > 100:
        #             log_data['content'] = f"<content truncated - {len(log_data['content'])} chars>"
        #         print(f"  {json.dumps(log_data, indent=2)}")
        #     else:
        #         print(f"  {response_data}")
        
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
        """Handle GET requests with URL and alert_id parameters"""
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
                    'usage': 'GET /?url=https://fleetdata-production.s3.amazonaws.com/...&alert_id=<alert_id>'
                }
                error = 'Missing url parameter'
                self.wfile.write(json.dumps(response_data).encode())
                return

            s3_url = query_params['url'][0]
            alert_id = query_params.get('alert_id', [None])[0]
            
            # First, check local storage if alert_id is provided
            if alert_id:
                cached_data = self.get_metadata_from_storage(alert_id)
                if cached_data:
                    response_data = {
                        'original_url': s3_url,
                        'content': cached_data.get('content', ''),
                        'is_binary': cached_data.get('is_binary', False),
                        'size_bytes': cached_data.get('size_bytes', 0),
                        'content_type': cached_data.get('content_type', 'application/json'),
                        'last_modified': cached_data.get('last_modified'),
                        'etag': cached_data.get('etag', ''),
                        'status': 'success',
                        'source': 'local_storage',
                        'alert_id': alert_id,
                        'processing_time_ms': round((time.time() - start_time) * 1000, 2)
                    }
                    
                    self.wfile.write(json.dumps(response_data, indent=2).encode())
                    return
            
            # If not found in storage or no alert_id, fetch from S3
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
                'source': 'aws_s3',
                'alert_id': alert_id,
                'processing_time_ms': round((time.time() - start_time) * 1000, 2)
            }
            
            # Save to local storage if alert_id is provided
            if alert_id:
                self.save_metadata_to_storage(alert_id, file_data)
            
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
                    'usage': 'POST with JSON: {"url": "https://fleetdata-production.s3.amazonaws.com/...", "alert_id": "<alert_id>"}',
                    'received_data': request_data
                }
                error = 'Missing url in request body'
                self.wfile.write(json.dumps(response_data).encode())
                return

            s3_url = request_data['url']
            alert_id = request_data.get('alert_id')
            
            # First, check local storage if alert_id is provided
            if alert_id:
                cached_data = self.get_metadata_from_storage(alert_id)
                if cached_data:
                    response_data = {
                        'original_url': s3_url,
                        'content': cached_data.get('content', ''),
                        'is_binary': cached_data.get('is_binary', False),
                        'size_bytes': cached_data.get('size_bytes', 0),
                        'content_type': cached_data.get('content_type', 'application/json'),
                        'last_modified': cached_data.get('last_modified'),
                        'etag': cached_data.get('etag', ''),
                        'status': 'success',
                        'source': 'local_storage',
                        'alert_id': alert_id,
                        'processing_time_ms': round((time.time() - start_time) * 1000, 2)
                    }
                    
                    self.wfile.write(json.dumps(response_data, indent=2).encode())
                    return
            
            # If not found in storage or no alert_id, fetch from S3
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
                'source': 'aws_s3',
                'alert_id': alert_id,
                'processing_time_ms': round((time.time() - start_time) * 1000, 2)
            }
            
            # Save to local storage if alert_id is provided
            if alert_id:
                self.save_metadata_to_storage(alert_id, file_data)
            
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
            raise Exception("AWS credentials not found. Please configure your AWS credentials or use --offline mode for local storage only.")
        except ClientError as e:
            raise Exception(f"AWS client error: {e}")
        except Exception as e:
            raise Exception(f"Error downloading from S3: {e}")

    def get_metadata_from_storage(self, alert_id):
        """
        Get metadata content from local storage
        
        :param alert_id: The alert ID
        :return: Dictionary with content in S3 response format or None if not found
        """
        if not alert_id:
            return None
            
        metadata_file = custom_metadata_location(alert_id) or os.path.join(self.STORAGE_DIR, f"{alert_id}.json")
        
        if os.path.exists(metadata_file):
            try:
                with open(metadata_file, 'r', encoding='utf-8') as f:
                    # Try to read as JSON first
                    try:
                        content_data = json.load(f)
                        # Convert back to string format for consistency with S3 response
                        content = json.dumps(content_data)
                        is_binary = False
                    except json.JSONDecodeError:
                        # If not JSON, read as plain text
                        f.seek(0)  # Reset file pointer
                        content = f.read()
                        is_binary = False
                
                print(f"✅ Found metadata in local storage: {metadata_file}")
                
                # Return in the same format as S3 response for consistency
                return {
                    'content': content,
                    'is_binary': is_binary,
                    'size_bytes': len(content.encode('utf-8')),
                    'content_type': 'application/json',
                    'last_modified': None,
                    'etag': ''
                }
            except Exception as e:
                print(f"❌ Error reading metadata from storage: {e}")
                return None
        else:
            print(f"📁 Metadata not found in local storage: {metadata_file}")
            return None
    
    def save_metadata_to_storage(self, alert_id, file_data):
        """
        Save only the metadata content to local storage
        
        :param alert_id: The alert ID
        :param file_data: Dictionary containing file data from S3 (with 'content' key)
        """
        if not alert_id:
            print("⚠️ Cannot save metadata: alert_id is required")
            return False
            
        metadata_file = os.path.join(self.STORAGE_DIR, f"{alert_id}.json")
        
        try:
            # Extract only the content and parse it if it's JSON
            content = file_data.get('content', '')
            
            # Try to parse content as JSON to store it properly formatted
            try:
                if content.strip().startswith('{') or content.strip().startswith('['):
                    parsed_content = json.loads(content)
                    with open(metadata_file, 'w', encoding='utf-8') as f:
                        json.dump(parsed_content, f, indent=2)
                else:
                    # If not JSON, store as plain text in a simple wrapper
                    with open(metadata_file, 'w', encoding='utf-8') as f:
                        f.write(content)
            except json.JSONDecodeError:
                # If JSON parsing fails, store as plain text
                with open(metadata_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                    
            print(f"💾 Saved metadata content to local storage: {metadata_file}")
            return True
        except Exception as e:
            print(f"❌ Error saving metadata to storage: {e}")
            return False

    def log_message(self, format, *args):
        """Override to customize logging - suppress default HTTP logging since we have detailed logging"""
        # We suppress the default HTTP request logging since we have our own detailed logging
        pass


def main():
    parser = argparse.ArgumentParser(description='S3 File Content Downloader Local Server with Local Storage')
    parser.add_argument('--port', type=int, default=8080, help='Port to run the server on (default: 8080)')
    parser.add_argument('--host', default='localhost', help='Host to bind to (default: localhost)')
    parser.add_argument('--offline', action='store_true', help='Run in offline mode (local storage only, no AWS)')
    
    args = parser.parse_args()
    
    # Test AWS credentials only if not in offline mode
    aws_available = False
    if not args.offline:
        try:
            s3_client = boto3.client('s3')
            s3_client.list_buckets()  # Simple test to verify credentials
            print("✅ AWS credentials verified")
            aws_available = True
        except NoCredentialsError:
            print("⚠️ AWS credentials not found!")
            print("Running in local storage mode only.")
            print("To enable AWS access, configure credentials using:")
            print("1. AWS CLI: aws configure")
            print("2. Environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN")
            print("3. AWS credentials file: ~/.aws/credentials")
            print("Or use --offline flag to suppress this warning.")
        except Exception as e:
            print(f"⚠️ AWS credentials test failed: {e}")
            print("Running in local storage mode only.")
    else:
        print("🔒 Running in offline mode (local storage only)")

    # Ensure neokpi_storage directory exists
    storage_dir = S3PresignerHandler.STORAGE_DIR
    os.makedirs(storage_dir, exist_ok=True)
    print(f"📁 Local storage directory: {os.path.abspath(storage_dir)}")

    # Start the server
    server_address = (args.host, args.port)
    httpd = HTTPServer(server_address, S3PresignerHandler)
    
    print(f"🚀 S3 File Content Downloader Server starting on http://{args.host}:{args.port}")
    print(f"📋 Usage:")
    print(f"   GET:  http://{args.host}:{args.port}/?url=https://fleetdata-production.s3.amazonaws.com/path/file.txt&alert_id=<alert_id>")
    print(f"   POST: http://{args.host}:{args.port}/ with JSON body: {{\"url\": \"https://...\", \"alert_id\": \"<alert_id>\"}}")
    print(f"💡 Local storage: Files cached as neokpi_storage/<alert_id>.json")
    print(f"💡 Press Ctrl+C to stop")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped")
        httpd.server_close()
        return 0


if __name__ == "__main__":
    exit(main())
