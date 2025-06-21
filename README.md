# Taiwan Submarine Cable Map

An interactive map application that displays the status and historical incidents of Taiwan's submarine cables. Built with React, TypeScript, and Vite.

## Features

- **Interactive Map**: View submarine cable routes and landing points using Leaflet maps
- **Real-time Status**: Monitor active and historical incidents affecting submarine cables
- **Uptime Timeline**: Visualize cable uptime data over the past year
- **Multi-language Support**: Available in English and Traditional Chinese
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Incident Tracking**: Detailed information about cable incidents including start time, estimated repair time, and resolution status

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/seadog007/smc.peering.tw.git
cd smc.peering.tw
```

2. Install dependencies:
```bash
npm install
```

3. Put necessary data
- src/data/landing-points.json: You can put `[]`
- src/data/incidents.json: Run `python3 convert_incidents.py`
- src/data/cables/*.json: You can leave the folder empty

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Data Sources

The application uses data from https://github.com/seadog007/tw-submarine-cable

Data is automatically updated and converted to static format using GitHub Actions.

## Data Format
#### src/data/landing-points.json
```
[
  {
    "id": "id",
    "name": "name",
    "coordinates": [
      121.12345,
      25.56789
    ]
  }
]
```

#### src/data/incidents.json
```
[
  {
    "date": "1900-01-01T00:00:00+08:00",
    "status": "(disconnected|partial_disconnected|notice)",
    "cableid": "cableID",
    "segment": "segmentID",
    "title": "Incident Title",
    "description": "Incident Describtion",
    "reparing_at": "2000-01-01T00:00:00+08:00",
    "resolved_at": "2010-01-01T00:00:00+08:00"
  }
]
```

#### src/data/cables/*.json: You can leave the folder empty
```
{
  "id": "cableID",
  "name": "Cable Display Name",
  "color": "#000000",
  "available_path": [
    [
      "Country_1",
      "segmentID",
      "Country_2"
    ]
  ],
  "equipments": [
    {
      "id": "equipmentID",
      "name": "Equipment Name",
      "type": "(BMH|AC|BU|Other)",
      "coordinate": [
        123.12345,
        12.12345,
      ]
    }
  ],
  "segments": [
    {
      "id": "segmentID",
      "hidden": (true|false),
      "color": "#000000",
      "coordinates": [
        [
          123.45678,
          12.34567
        ],
        [
          123.45679,
          12.34568
        ]
      ]
    }
  ]
}
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Style

This project uses ESLint for code linting. The configuration includes:
- TypeScript ESLint rules
- React-specific linting rules
- Stylistic rules for consistent code formatting

## Sponsorship

This project is sponsored by [TWDS](https://www.twds.com.tw/) and its sub-project [STUIX](https://stuix.io/). TWDS aims to promote the Peering ecosystem in Taiwan, avoiding the situation where traffic needs to be routed out of the country and then back to the country. We also introduce lots of foreign network cache to help establish the Peering ecosystem in Taiwan.

**Sponsor Link**: [TWDS Sponsor Link](https://sponsor.twds.com.tw/)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Version History

- **v1.2.2** (2025-06-21): Added NCP S5, S6, S1.4 Cable Data
- **v1.2.1** (2025-06-19): Fixed Mobile Button Position
- **v1.2.0** (2025-06-19): Added Mobile Version Map
- **v1.1.1** (2025-06-18): Added EAC1 Segment E Cable Data
- **v1.1.0** (2025-06-18): Added Version History
- **v1.0.1** (2025-06-16): UI Improvements, Added Estimated Repairing Time and Resolved Time
- **v1.0.0** (2025-06-15): Initial release
 