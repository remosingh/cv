# Agentic City - AI Agent Coordination Platform

A unique AI agent platform that visualizes agent coordination as a living, SimCity-style isometric city. Users interact with a central coordination agent that spawns specialized agents to complete research, writing, editing, and analysis tasks.

## Features

### Beta Release (Enhanced)
- **Isometric City Visualization**: SimCity-style view with buildings representing agents
- **Central Coordination Agent**: Intelligent hub that orchestrates complex multi-agent workflows
- **Specialized Agents**: Research, Writing, Editing, and Analysis agents with web search capabilities
- **🆕 Web Search Integration**: Agents can access real-time data from the internet (2025)
- **🆕 Intelligent Workflow Management**: Automatic task decomposition for complex projects
- **🆕 Business Case Generator**: Complete investor-ready business cases with market research and financials
- **Document Management**: Create, edit, and download professional documents
- **Real-time Information Flow**: Visual indicators showing agent communication
- **Firebase Integration**: Persistent data storage and authentication
- **Claude AI Integration**: Powered by Anthropic's Claude 3.5 Sonnet

### Architecture
- **Hub-and-Spoke Model**: All agents communicate through the coordinator
- **React Frontend**: Modern, responsive UI
- **Phaser 3**: Isometric game engine for city visualization
- **Firebase**: Authentication, Firestore database, and hosting
- **Claude API**: AI-powered agent intelligence

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Firebase account
- Anthropic Claude API key
- **Recommended**: Tavily API key for web search capabilities (free tier available)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cv
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**

   a. Create a new project at [Firebase Console](https://console.firebase.google.com/)

   b. Enable Authentication:
      - Go to Authentication → Sign-in method
      - Enable Email/Password and Google sign-in

   c. Create Firestore Database:
      - Go to Firestore Database → Create database
      - Start in production mode
      - Choose your preferred region

   d. Get your Firebase configuration:
      - Go to Project Settings → General
      - Scroll to "Your apps" and create a web app
      - Copy the configuration object

4. **Configure environment variables**

   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your credentials:
   ```env
   # Required
   REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id

   REACT_APP_CLAUDE_API_KEY=your_claude_api_key

   # Recommended for web search (choose one)
   REACT_APP_TAVILY_API_KEY=your_tavily_api_key  # Recommended
   # OR
   # REACT_APP_SERPER_API_KEY=your_serper_api_key
   # OR
   # REACT_APP_BRAVE_API_KEY=your_brave_api_key
   ```

5.1. **Get a Web Search API Key (Recommended)**

   The platform works without web search, but agents will be limited to Claude's training data.

   For real-time data access (strongly recommended):
   - **Tavily** (Recommended): Visit https://tavily.com - optimized for AI agents, free tier available
   - **Serper**: Visit https://serper.dev - Google search API
   - **Brave**: Visit https://brave.com/search/api/ - Privacy-focused search

   Add at least one search API key to your `.env` file.

5. **Deploy Firestore security rules**

   Install Firebase CLI if you haven't:
   ```bash
   npm install -g firebase-tools
   ```

   Login and initialize:
   ```bash
   firebase login
   firebase init
   ```
   Select Firestore and Hosting, then deploy rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

6. **Start the development server**
   ```bash
   npm start
   ```

   The app will open at `http://localhost:3000`

## Usage

### First Time Setup
1. Sign up with email/password or Google
2. You'll see the isometric city view with the Coordination Office at the center

### Working with Agents

#### Sending Tasks
- Type your task in the chat interface
- The coordinator analyzes your request
- Specialized agents are spawned as needed
- Watch the city as new "buildings" appear for each agent
- Information flows are visualized as animated particles between buildings

#### Example Tasks

**Simple Tasks:**
```
"Research the history of artificial intelligence"
→ Spawns a Research Agent (with web search if configured)

"Write a formal letter of recommendation for John Smith"
→ Spawns a Writer Agent

"Analyze the pros and cons of remote work"
→ Spawns an Analyst Agent
```

**Complex Multi-Agent Workflows:**
```
"Research a promising high cash flow business in Edmonton.
Research market demands and create a business case.
Determine all financials. Prepare a bankable report
for investors. Max payback period of 12 months."

→ Coordinator Creates 5-Step Workflow:
   1. Market Research Agent (with web search for 2025 data)
   2. Financial Analysis Agent  (calculations + web search for rates/costs)
   3. Business Strategy Agent
   4. Writer Agent (creates comprehensive business case)
   5. Editor Agent (polishes for investor presentation)

→ Final document saved to Documents tab
→ Ready to download and present to investors
```

### Viewing Documents
1. Click the "Documents" tab in the header
2. Browse documents created by agents
3. Click a document to view its contents
4. Download documents as text files
5. Delete documents you no longer need

### Agent Interaction
- Click on any building in the city to focus on that agent
- The task interface updates to show that agent's information
- All communication still routes through the coordinator

## Project Structure

```
cv/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Login.js/css          # Authentication UI
│   │   ├── Dashboard.js/css      # Main application container
│   │   ├── CityView.js/css       # Phaser city integration
│   │   ├── TaskInterface.js/css  # Chat/task interface
│   │   └── DocumentViewer.js/css # Document management
│   ├── contexts/
│   │   └── AuthContext.js        # Firebase auth context
│   ├── phaser/
│   │   └── CityScene.js          # Phaser 3 isometric scene
│   ├── services/
│   │   ├── firebase.js           # Firebase initialization
│   │   ├── claudeAPI.js          # Claude API integration
│   │   ├── agentService.js       # Enhanced agent management with workflows
│   │   ├── searchService.js      # 🆕 Web search integration
│   │   ├── workflowService.js    # 🆕 Multi-step workflow orchestration
│   │   └── documentService.js    # Document operations
│   ├── App.js                    # Root component
│   └── index.js                  # Entry point
├── firestore.rules               # Firestore security rules
├── firestore.indexes.json        # Firestore indexes
├── firebase.json                 # Firebase configuration
├── package.json                  # Dependencies
└── .env.example                  # Environment template
```

## Agent Types

### Coordinator Agent (Default)
- Central hub for all communication
- Analyzes user requests
- Delegates tasks to specialized agents
- Synthesizes results from multiple agents
- Located at the center of the city (blue building)

### Researcher Agent
- **🆕 Web search enabled**: Access real-time market data, statistics, and trends
- Gathers information on specific topics
- Finds facts, data, and relevant details from current sources
- Cites all sources with URLs
- Provides structured research results
- Purple building in the city

### Writer Agent
- Creates well-written documents
- Drafts letters, reports, articles
- Maintains appropriate tone and style
- Red building in the city

### Editor Agent
- Reviews and improves documents
- Checks grammar, clarity, coherence
- Suggests improvements
- Gold building in the city

### Analyst Agent
- **🆕 Web search enabled**: Access current financial data and market metrics
- Performs financial calculations and modeling
- Calculates ROI, payback periods, break-even points
- Creates revenue and expense projections
- Analyzes data and identifies patterns
- Provides data-driven recommendations
- Teal building in the city

## Development

### Available Scripts

- `npm start` - Run development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

### Building for Production

```bash
npm run build
```

This creates an optimized build in the `build/` folder.

### Deploying to Firebase Hosting

```bash
npm run build
firebase deploy --only hosting
```

## Security

### Firestore Rules
The application uses security rules to ensure:
- Users can only access their own agents
- Users can only access their own documents
- All operations require authentication

### API Keys
- Never commit `.env` file to version control
- Keep your Claude API key secure
- Monitor API usage for unexpected charges

## New in This Release

### Web Search Integration ✨
- Agents can now access real-time information from the internet
- Supports Tavily (recommended), Serper, and Brave Search APIs
- Automatic search execution when agents need current data
- All sources cited with URLs

### Intelligent Workflow Management ✨
- Automatic task decomposition for complex projects
- Multi-step workflows with dependency tracking
- **Business Case Workflow**: 5-step process creating investor-ready documents
  - Market research with current data
  - Financial analysis and projections
  - Business strategy development
  - Professional document drafting
  - Editorial review and polish
- **Research Workflow**: Structured research, analysis, and reporting
- Each workflow step tracked and saved in Firebase

### Enhanced Agent Capabilities ✨
- **Researcher**: Web search for current market data, trends, statistics
- **Analyst**: Web search for financial metrics, rates, and benchmarks
- **Writer**: Creates investor-ready business cases, reports, and documents
- **Editor**: Quality control ensuring professional, publication-ready output
- **Coordinator**: Intelligent workflow orchestration and validation

## Future Enhancements

### Planned Features
- Agent-to-agent direct communication
- More document types (spreadsheets, presentations, PDFs)
- Advanced agent behaviors and specializations
- Team collaboration features
- Mobile app version
- Voice interaction
- Integration with external services (email, calendar, CRM)
- Advanced task scheduling and automation
- Custom workflow templates
- Multi-language support

## Troubleshooting

### Common Issues

**"Claude API key not configured"**
- Check that your `.env` file exists
- Verify `REACT_APP_CLAUDE_API_KEY` is set correctly
- Restart the development server after changing `.env`

**Web search not working**
- Verify you've added at least one search API key to `.env`
- Check API key is valid and has remaining quota
- Tavily recommended for best AI agent performance
- Platform works without search but with limited data access

**Firebase authentication errors**
- Verify Firebase credentials in `.env`
- Check that Authentication is enabled in Firebase Console
- Ensure your domain is authorized in Firebase settings

**Agents not appearing in the city**
- Check browser console for errors
- Verify Firestore rules are deployed
- Ensure user is authenticated

**Performance issues**
- Too many agents may slow down the visualization
- Consider clearing old agents periodically
- Check network tab for slow API calls

## API Usage and Costs

### Claude API
- The application uses Claude 3.5 Sonnet model
- Each agent message consumes API tokens
- **Complex workflows**: Multiple agents = multiple API calls
- Example: Business case workflow = ~5 agents × 2-3 calls each
- Monitor usage in your Anthropic account
- Consider implementing rate limiting for production

### Web Search APIs
- **Tavily**: 1,000 free searches/month, then $0.001/search
- **Serper**: 2,500 free searches, then $0.001/search
- **Brave**: 2,000 free queries/month
- Most workflows use 5-15 searches total

### Firebase
- Free tier includes:
  - 50K reads/day
  - 20K writes/day
  - 1GB storage
- Monitor usage in Firebase Console

### Cost Example
A typical business case workflow:
- Claude API: ~50K tokens = ~$0.25-0.50
- Web search: 10 searches = $0.01 (Tavily/Serper)
- Firebase: Well within free tier
- **Total**: < $1 for a complete investor-ready business case

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

[Add your license here]

## Support

For issues and questions:
- GitHub Issues: [repository-url]/issues
- Documentation: This README
- Firebase Docs: https://firebase.google.com/docs
- Anthropic Docs: https://docs.anthropic.com

## Acknowledgments

- Built with React and Phaser 3
- Powered by Claude AI (Anthropic)
- Backend by Firebase
- Inspired by SimCity's isometric visualization

---

**Note**: This is a beta release. Features and APIs may change as the platform evolves.
