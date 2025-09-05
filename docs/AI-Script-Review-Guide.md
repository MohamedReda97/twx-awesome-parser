# 🤖 AI Script Review Feature Guide

The TWX Parser now includes a comprehensive AI-powered script review feature that analyzes JavaScript code from IBM BPM objects for quality, security, and performance issues.

## 🚀 Quick Start

### 1. Configure AI Provider
1. Click the **"⚙️ AI Settings"** button in the web interface
2. Select your preferred AI provider:
   - **Claude (Anthropic)**: Best for comprehensive analysis
   - **DeepSeek**: Cost-effective coding specialist
   - **Google Gemini**: Fast and capable with good code understanding
   - **Groq**: Ultra-fast inference with open-source models
   - **Custom Endpoint**: Use your own AI service
3. Enter your API key and configure settings
4. Click **"Test Connection"** to verify setup
5. Save configuration

### 2. Analyze Scripts
**Option A: Analyze All Scripts**
- Click **"🤖 Start AI Analysis"** in the main interface
- Wait for analysis to complete with real-time progress updates

**Option B: Analyze Individual Object Scripts**
- Select any object with scripts (Coach View, CSHS, Service)
- Click **"🤖 Analyze Scripts with AI"** in the Scripts section
- View results specific to that object

### 3. Review Results
- View comprehensive analysis results in the **AI Script Analysis Results** panel
- Filter by severity: Critical, Warning, Info
- Export results to JSON or CSV for reporting
- Review specific suggestions and line number references

## 🔧 Configuration Options

### AI Providers

#### Claude (Anthropic)
- **API Key**: Get from [Anthropic Console](https://console.anthropic.com/)
- **Models**: Claude 3 Sonnet (recommended), Haiku, Opus
- **Best for**: Comprehensive analysis with detailed explanations

#### DeepSeek
- **API Key**: Get from [DeepSeek Platform](https://platform.deepseek.com/)
- **Models**: DeepSeek Coder (recommended), DeepSeek Chat
- **Best for**: Code-focused analysis with good performance

#### Google Gemini
- **API Key**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Models**: Gemini 1.5 Pro (recommended), Gemini 1.5 Flash, Gemini Pro
- **Best for**: Fast analysis with strong code understanding and reasoning

#### Groq
- **API Key**: Get from [Groq Console](https://console.groq.com/keys)
- **Models**:
  - **Llama 3.3 70B Versatile** (recommended) - Latest model with best balance of speed and capability
  - **Llama 3.1 70B Versatile** - Previous generation, still excellent
  - **Llama 3.1 8B Instant** - Ultra-fast for quick analysis
  - **Llama 3 70B** - Strong reasoning capabilities
  - **Mixtral 8x7B** - Good for complex code analysis
  - **Gemma 7B** - Lightweight option
- **Best for**: Ultra-fast inference with open-source models, cost-effective at scale

#### Custom Endpoint
- **Endpoint URL**: Your custom AI service URL
- **API Key**: Optional, depending on your service
- **Headers**: Custom headers in JSON format
- **Best for**: Enterprise or self-hosted AI services

### Analysis Settings
- **Batch Size**: Number of scripts per API request (1-20)
- **Analysis Focus**: Choose what to analyze
  - ✅ Syntax Errors
  - ✅ Performance Issues
  - ✅ Security Vulnerabilities
  - ✅ Best Practices
- **Cache Results**: Store results locally for faster access

## 📊 Analysis Results

### Issue Severity Levels
- **🔴 Critical**: Syntax errors, security vulnerabilities, breaking issues
- **🟡 Warning**: Performance problems, deprecated usage, potential bugs
- **🔵 Info**: Code quality suggestions, best practice recommendations

### Issue Types
- **Syntax**: JavaScript syntax errors and parsing issues
- **Performance**: Inefficient code patterns, optimization opportunities
- **Security**: XSS risks, injection vulnerabilities, unsafe practices
- **Best Practice**: Code quality, maintainability, IBM BPM conventions
- **TeamWorks Specific**: IBM BPM/TeamWorks API usage issues

### Overall Scores
- **A**: Excellent code quality, no significant issues
- **B**: Good code with minor improvements needed
- **C**: Average code with some issues to address
- **D**: Poor code quality with multiple problems
- **F**: Critical issues requiring immediate attention

## 🎯 What Gets Analyzed

### Coach Views
- Inline JavaScript scripts
- Load JS functions
- Event handlers and custom code

### CSHS (Client-Side Human Services)
- Script tasks
- Pre/post assignment scripts
- Gateway conditions
- Form task scripts

### Services & Web Services
- Main service scripts
- Operation implementations
- Error handling code

## 📈 Best Practices for AI Analysis

### 1. **Start Small**
- Begin with a few objects to test your AI provider setup
- Adjust batch size based on your API rate limits

### 2. **Review Configuration**
- Use appropriate models for your needs (Sonnet for detailed analysis, Haiku for speed)
- Adjust temperature (0.1 for consistent results, higher for creative suggestions)

### 3. **Interpret Results**
- Focus on Critical and Warning issues first
- Use suggestions as guidance, not absolute rules
- Consider IBM BPM context when applying recommendations

### 4. **Export and Share**
- Export results to CSV for team reviews
- Use JSON exports for integration with other tools
- Save analysis results for tracking improvements over time

## 🔍 Troubleshooting

### Common Issues

**"No scripts found for analysis"**
- Ensure your TWX file contains objects with JavaScript code
- Check that scripts are properly extracted in the object details

**"API key not configured"**
- Verify your API key is entered correctly in AI Settings
- Test the connection to ensure the key is valid

**"Analysis failed"**
- Check your internet connection
- Verify API rate limits haven't been exceeded
- Try reducing batch size in settings

**"Connection failed"**
- Verify the endpoint URL is correct
- Check if custom headers are properly formatted JSON
- Ensure your API key has the necessary permissions

### Performance Tips
- **Reduce batch size** if you encounter rate limit errors
- **Enable caching** to avoid re-analyzing unchanged scripts
- **Focus analysis** on specific areas if you don't need comprehensive review

## 🔒 Security & Privacy

- **API Keys**: Stored locally in configuration files, never transmitted except to your chosen AI provider
- **Script Content**: Sent only to your configured AI provider for analysis
- **Results**: Stored locally and can be exported or cleared as needed
- **No Data Retention**: The AI providers don't retain your code (check provider policies)

## 📝 Example Analysis Output

```json
{
  "script_id": "script_1",
  "issues": [
    {
      "severity": "warning",
      "type": "performance",
      "description": "Inefficient string concatenation in loop",
      "line_number": 15,
      "suggestion": "Use array.join() or template literals for better performance"
    },
    {
      "severity": "critical",
      "type": "security",
      "description": "Potential XSS vulnerability with unescaped user input",
      "line_number": 23,
      "suggestion": "Escape user input before inserting into DOM"
    }
  ],
  "overall_score": "C",
  "summary": "Script has performance and security issues that should be addressed"
}
```

## 🆘 Support

If you encounter issues with the AI script review feature:
1. Check the browser console for error messages
2. Verify your AI provider configuration
3. Test with a simple TWX file first
4. Review the analysis focus settings
5. Check API rate limits and quotas

The AI script review feature helps identify potential issues in your IBM BPM scripts, but human review and testing are still essential for production deployments.
