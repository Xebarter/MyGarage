import { GoogleGenerativeAI } from '@google/generative-ai';

// Get the API key from environment variables
const apiKey = process.env.VITE_GEMINI_API_KEY || import.meta.env?.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.error("GEMINI_API_KEY not found in environment variables.");
} else {
  // Initialize the client
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Test with a known working model
  async function testModels() {
    try {
      // Try different models in order of preference
      const modelsToTry = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-pro'];
      let workingModel = null;
      
      for (const modelName of modelsToTry) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent("Say 'Hello, World!'");
          console.log(`Model ${modelName} is working correctly.`);
          workingModel = modelName;
          break;
        } catch (error) {
          console.log(`Model ${modelName} is not available:`, error.message);
        }
      }
      
      if (workingModel) {
        console.log(`Recommended model: ${workingModel}`);
      } else {
        console.error("No working models found. Please check your API key and network connection.");
      }
      
      // List all available models
      const result = await genAI.listModels();
      console.log('\nAll available models:');
      result.models.forEach(model => {
        console.log(`- ${model.name}`);
      });
    } catch (error) {
      console.error("Error testing models:", error);
    }
  }

  testModels();
}