import { GoogleGenerativeAI } from '@google/generative-ai';

// Get the API key from environment variables
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.error("GEMINI_API_KEY not found in environment variables.");
} else {
  // Initialize the client
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Test with a known working model
  async function testModels() {
    try {
      // Try different models in order of preference
      const modelsToTry = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-pro', 'gemini-pro', 'gemini-1.0-pro'];
      let workingModel = null;
      
      console.log('Testing available models...');
      
      for (const modelName of modelsToTry) {
        try {
          console.log(`\nTrying model: ${modelName}`);
          const model = genAI.getGenerativeModel({ 
            model: modelName,
            generationConfig: {
              responseMimeType: "application/json"
            }
          });
          
          // Test with a simple prompt
          const result = await model.generateContent({
            contents: [{
              role: 'user',
              parts: [{ text: 'Say "Hello, World!" in JSON format {"message": "Hello, World!"}' }]
            }]
          });
          
          const response = await result.response;
          const text = response.text();
          console.log(`✓ Model ${modelName} is working. Response:`, text);
          workingModel = modelName;
          break;
        } catch (error) {
          console.log(`✗ Model ${modelName} failed:`, error.message);
        }
      }
      
      if (workingModel) {
        console.log(`\n✅ Recommended model: ${workingModel}`);
      } else {
        console.error("\n❌ No working models found. Please check your API key and network connection.");
      }
      
      // List all available models
      try {
        const result = await genAI.listModels();
        console.log('\n📋 All available models from API:');
        result.models
          .filter(model => model.name.startsWith('models/gemini'))
          .forEach(model => {
            console.log(`- ${model.name} (${model.displayName || 'No display name'})`);
          });
      } catch (listError) {
        console.error("\n❌ Error listing models:", listError);
      }
    } catch (error) {
      console.error("Error testing models:", error);
    }
  }

  testModels();
}