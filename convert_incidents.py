import csv
import json
from datetime import datetime, timedelta
import pytz
import requests
from io import StringIO

def is_within_specific_days(date_str, days):
    if not date_str:
        return False
    
    # Parse the date string
    try:
        date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        # Convert to UTC for consistent comparison
        date = date.astimezone(pytz.UTC)
    except ValueError:
        return False
    
    # Get current time in UTC
    now = datetime.now(pytz.UTC)
    specific_date = now - timedelta(days=days)
    
    return date >= specific_date

def convert_incidents():
    # URL from incident.py
    url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR4ufKCDRwgDT24QpIzJYAK8O5kF2jffqwpc6EdbRV2YZ4oHAXuX3SbWxpJTg7fdMLVWBbSKt9M57XR/pub?gid=0&single=true&output=tsv'
    
    try:
        # Fetch the data with proper encoding
        response = requests.get(url)
        response.raise_for_status()
        response.encoding = 'utf-8'  # Force UTF-8 encoding
        
        # Read TSV data
        tsv_data = StringIO(response.text)
        reader = csv.DictReader(tsv_data, delimiter='\t')
        
        # Process and filter incidents
        filtered_incidents = []
        for row in reader:
            # Check if either date or resolved_at is within 6 months
            if is_within_specific_days(row['date'], 365*2) or is_within_specific_days(row['resolved_at'], 365*2):
                filtered_incidents.append({
                    'date': row['date'],
                    'status': row['status'],
                    'cableid': row['cableid'],
                    'segment': row['segment'],
                    'title': row['title'],
                    'description': row['description'].strip('"'),  # Remove any extra quotes
                    'reparing_at': row['reparing_at'],
                    'resolved_at': row['resolved_at']
                })
        
        # Write to JSON file with UTF-8 encoding
        with open('incidents.json', 'w', encoding='utf-8') as f:
            json.dump(filtered_incidents, f, indent=2, ensure_ascii=False)
        
        print(f"Successfully converted and filtered {len(filtered_incidents)} incidents to JSON format")
        
    except requests.RequestException as e:
        print(f"Error fetching data: {e}")
    except Exception as e:
        print(f"Error processing data: {e}")

if __name__ == "__main__":
    convert_incidents() 