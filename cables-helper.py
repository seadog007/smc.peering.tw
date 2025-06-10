import json
import argparse
import os
import random
from collections import deque

def convert_cable_data(input_file, output_file, cable_id, cable_name):
    """
    Converts a JSON file with a list of coordinate segments to a structured
    JSON file with cable information.
    """
    try:
        with open(input_file, 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: Input file not found at {input_file}")
        return
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {input_file}")
        return

    output_data = {
        "id": cable_id,
        "name": cable_name,
        "segments": []
    }

    for i, segment_coords in enumerate(data):
        color = "#" + ''.join([random.choice('0123456789ABCDEF') for _ in range(6)])

        segment = {
            "id": f"{cable_id}-{i+1}",
            "hidden": False,
            "color": color,
            "coordinates": segment_coords
        }
        output_data["segments"].append(segment)

    # Ensure the output directory exists
    output_dir = os.path.dirname(output_file)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    with open(output_file, 'w') as f:
        json.dump(output_data, f, indent=2)

    print(f"Successfully converted {input_file} to {output_file}")

def are_close(p1, p2, tol=1e-9):
    return abs(p1[0] - p2[0]) < tol and abs(p1[1] - p2[1]) < tol

def merge_segments(input_file, output_file):
    """
    Merges connectable segments in a cable JSON file.
    It matches segment endpoints to create continuous paths.
    Disjoint paths are kept as separate segments in the output.
    """
    try:
        with open(input_file, 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: Input file not found at {input_file}")
        return
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {input_file}")
        return

    unprocessed_segments = data.get('segments')
    if not unprocessed_segments:
        print("No segments found to merge.")
        return

    final_segments = []
    segment_counter = 1

    while unprocessed_segments:
        # Start a new path with the first available segment
        current_path_data = unprocessed_segments.pop(0)
        path_deque = deque(current_path_data['coordinates'])
        
        # Keep trying to connect segments to the current path
        while True:
            was_connection_made = False
            head = path_deque[0]
            tail = path_deque[-1]
            
            i = 0
            while i < len(unprocessed_segments):
                segment_to_try = unprocessed_segments[i]
                seg_start = segment_to_try['coordinates'][0]
                seg_end = segment_to_try['coordinates'][-1]
                
                connection_found = True
                if are_close(seg_start, tail):
                    coords_to_append = segment_to_try['coordinates'][1:]
                    path_deque.extend(coords_to_append)
                elif are_close(seg_end, tail):
                    coords_to_append = segment_to_try['coordinates'][:-1]
                    path_deque.extend(reversed(coords_to_append))
                elif are_close(seg_end, head):
                    coords_to_prepend = segment_to_try['coordinates'][:-1]
                    for point in reversed(coords_to_prepend):
                        path_deque.appendleft(point)
                elif are_close(seg_start, head):
                    coords_to_prepend = segment_to_try['coordinates'][1:]
                    for point in reversed(coords_to_prepend):
                        path_deque.appendleft(point)
                else:
                    connection_found = False

                if connection_found:
                    unprocessed_segments.pop(i)
                    was_connection_made = True
                else:
                    i += 1
            
            if not was_connection_made:
                break  # This path is complete

        # Path is complete, add it to our list of final segments
        new_segment = {
            "id": f"{data['id']}-merged-{segment_counter}",
            "hidden": current_path_data.get('hidden', False),
            "color": current_path_data.get('color', '#FF6633'),
            "coordinates": list(path_deque)
        }
        final_segments.append(new_segment)
        segment_counter += 1

    data['segments'] = final_segments

    output_dir = os.path.dirname(output_file)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"Successfully created {len(final_segments)} continuous segments in {output_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Convert or merge cable JSON data.')
    parser.add_argument('input_file', help='The input JSON file')
    parser.add_argument('output_file', help='The output JSON file')
    parser.add_argument('--cable_id', help='The ID for the new cable (e.g., my-cable)')
    parser.add_argument('--cable_name', help='The name for the new cable (e.g., "My Cable")')
    parser.add_argument('--merge', action='store_true', help='Merge all segments into one')

    args = parser.parse_args()

    if args.merge:
        merge_segments(args.input_file, args.output_file)
    elif args.cable_id and args.cable_name:
        convert_cable_data(args.input_file, args.output_file, args.cable_id, args.cable_name)
    else:
        parser.error("For conversion, --cable_id and --cable_name are required.")