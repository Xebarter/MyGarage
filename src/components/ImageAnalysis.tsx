import { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Upload, Sparkles, Loader2, AlertCircle, Copy, Camera as CameraIcon, Image as ImageIcon, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Part } from '../lib/supabase';

interface AnalysisResult {
  name: string;
  brand: string;
  description: string;
  compatibleModels: string[];
  confidence: number;
  recommendedParts: Part[];
}

export function ImageAnalysis() {
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showCamera, setShowCamera] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Handle Escape key to close the component
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        navigate('/');
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [navigate]);

  // Initialize camera on component mount
  useEffect(() => {
    if (showCamera) {
      initializeCamera();
    }
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [showCamera]);

  const initializeCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Could not access camera. Please check permissions or upload an image instead.');
      setShowCamera(false);
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg');
        setSelectedImage(imageData);
        setAnalysisResult(null);
        setError(null);
        
        // Stop the camera stream
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setStream(null);
        }
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match('image.*')) {
      setError('Please upload an image file (JPEG, PNG, etc.)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
      setAnalysisResult(null);
      setError(null);
      setShowCamera(false);
      
      // Stop the camera stream if it's active
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async () => {
    if (!selectedImage) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      // Get the Gemini API key from environment variables
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API key not configured. Please add VITE_GEMINI_API_KEY to your environment variables.');
      }

      // Initialize Google Generative AI client with the correct API version
      const genAI = new GoogleGenerativeAI(apiKey);
      // Using gemini-1.5-flash-latest model which is more stable
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash-latest',
        generationConfig: {
          maxOutputTokens: 1000,
        }
      });

      // Convert base64 image to the format expected by Gemini
      const base64Data = selectedImage.split(',')[1];
      
      // Create the prompt for the AI
      const prompt = `Analyze this image of a car part and provide the following information:
        1. Part name
        2. Brand/manufacturer
        3. Detailed description of the part and its function
        4. List of compatible car models (make and model year ranges)
        5. Confidence level of your analysis as a percentage
        
        Format your response as JSON with these fields:
        {
          "name": "...",
          "brand": "...",
          "description": "...",
          "compatibleModels": ["...", "..."],
          "confidence": 0-100
        }
        
        If you cannot identify the part, respond with:
        {
          "error": "Unable to identify the part in the image"
        }`;

      // Call the Gemini API
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: 'image/jpeg'
          }
        }
      ]);

      const response = await result.response;
      const text = response.text();
      
      // Parse the JSON response
      try {
        // Extract JSON from the response (sometimes there's extra text)
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}') + 1;
        const jsonString = text.substring(jsonStart, jsonEnd);
        const parsedResult = JSON.parse(jsonString);
        
        if (parsedResult.error) {
          throw new Error(parsedResult.error);
        }
        
        // Create a complete analysis result
        const completeResult: AnalysisResult = {
          ...parsedResult,
          recommendedParts: [] // We'll populate this with actual parts from the database in a real implementation
        };
        
        setAnalysisResult(completeResult);
      } catch (parseError) {
        console.error('Parse error:', parseError);
        throw new Error('Failed to parse AI response');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze image. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetAnalysis = () => {
    setSelectedImage(null);
    setAnalysisResult(null);
    setError(null);
    setShowCamera(true);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Restart camera if needed
    if (showCamera && !stream) {
      initializeCamera();
    }
  };

  const switchToUpload = () => {
    setShowCamera(false);
    
    // Stop the camera stream if it's active
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    // Trigger file input
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
  };

  const switchToCamera = () => {
    setSelectedImage(null);
    setAnalysisResult(null);
    setError(null);
    setShowCamera(true);
    initializeCamera();
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        {/* Header with close button */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Part Identifier</h2>
            <p className="text-slate-600">
              Take a photo or upload an image of a car part to get AI-powered identification
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        {!selectedImage ? (
          <div className="space-y-6">
            {showCamera && !error ? (
              <div className="space-y-4">
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                  {stream ? (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-contain"
                      />
                      <canvas ref={canvasRef} className="hidden" />
                    </>
                  ) : (
                    <div className="text-white">Loading camera...</div>
                  )}
                </div>
                
                <div className="flex justify-center gap-4">
                  <button
                    onClick={captureImage}
                    className="p-4 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                    aria-label="Capture image"
                  >
                    <div className="w-12 h-12 bg-red-500 rounded-full"></div>
                  </button>
                  
                  <button
                    onClick={() => setShowCamera(false)}
                    className="p-4 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                    aria-label="Switch to upload"
                  >
                    <ImageIcon className="w-6 h-6 text-gray-700" />
                  </button>
                </div>
              </div>
            ) : (
              <div 
                className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-orange-400 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">Upload Part Image</h3>
                <p className="text-slate-500 mb-4">
                  Drag and drop an image here, or click to select a file
                </p>
                <p className="text-sm text-slate-400">
                  Supports JPG, PNG up to 5MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCamera(true);
                    initializeCamera();
                  }}
                  className="mt-4 flex items-center gap-2 text-orange-600 hover:text-orange-700 mx-auto"
                >
                  <CameraIcon className="w-5 h-5" />
                  <span>Use Camera Instead</span>
                </button>
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center text-red-800">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  <span>{error}</span>
                </div>
                
                <button
                  onClick={() => {
                    setError(null);
                    setShowCamera(true);
                    initializeCamera();
                  }}
                  className="mt-3 flex items-center gap-2 text-orange-600 hover:text-orange-700"
                >
                  <CameraIcon className="w-5 h-5" />
                  <span>Try Camera Again</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-1/2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium text-slate-900">Captured Image</h3>
                  <button
                    onClick={switchToCamera}
                    className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1"
                  >
                    <CameraIcon className="w-4 h-4" />
                    Retake
                  </button>
                </div>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <img 
                    src={selectedImage} 
                    alt="Captured part" 
                    className="w-full h-auto max-h-96 object-contain"
                  />
                </div>
              </div>
              
              {analysisResult ? (
                <div className="md:w-1/2">
                  <h3 className="text-lg font-medium text-slate-900 mb-2">Analysis Results</h3>
                  <div className="border border-slate-200 rounded-lg p-4 space-y-4 max-h-96 overflow-y-auto">
                    <div>
                      <h4 className="font-medium text-slate-900">Identified Part</h4>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-lg font-semibold">{analysisResult.name}</p>
                          <p className="text-slate-600">{analysisResult.brand}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(`${analysisResult.name} by ${analysisResult.brand}`)}
                          className="p-1 text-slate-500 hover:text-slate-700"
                          title="Copy to clipboard"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-slate-900">Description</h4>
                      <p className="text-slate-700">{analysisResult.description}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-slate-900">Compatible Models</h4>
                      <ul className="list-disc list-inside text-slate-700 space-y-1">
                        {analysisResult.compatibleModels.map((model, index) => (
                          <li key={index}>{model}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="pt-2">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-slate-700 mr-2">
                          Confidence: {analysisResult.confidence}%
                        </span>
                        <div className="flex-1 bg-slate-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${analysisResult.confidence}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    
                    {analysisResult.recommendedParts.length > 0 && (
                      <div>
                        <h4 className="font-medium text-slate-900 mb-2">Recommended Replacement Parts</h4>
                        <div className="text-sm text-slate-600">
                          In a full implementation, this would show actual parts from our catalog that match your identified part.
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {copied && (
                    <div className="mt-2 text-sm text-green-600 flex items-center">
                      <Copy className="w-4 h-4 mr-1" />
                      Copied to clipboard!
                    </div>
                  )}
                </div>
              ) : (
                <div className="md:w-1/2 flex items-center justify-center">
                  {isAnalyzing ? (
                    <div className="text-center">
                      <Loader2 className="mx-auto h-12 w-12 text-orange-500 animate-spin mb-4" />
                      <h3 className="text-lg font-medium text-slate-900 mb-2">Analyzing Image</h3>
                      <p className="text-slate-600">Using AI to identify your car part...</p>
                    </div>
                  ) : error ? (
                    <div className="text-center">
                      <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                      <h3 className="text-lg font-medium text-slate-900 mb-2">Analysis Failed</h3>
                      <p className="text-slate-600 mb-4">{error}</p>
                      <button
                        onClick={resetAnalysis}
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : (
                    <div className="text-center p-4">
                      <Sparkles className="mx-auto h-12 w-12 text-orange-500 mb-4" />
                      <h3 className="text-lg font-medium text-slate-900 mb-2">Ready to Analyze</h3>
                      <p className="text-slate-600 mb-4">
                        Click the button below to use AI to identify this car part
                      </p>
                      <button
                        onClick={analyzeImage}
                        disabled={isAnalyzing}
                        className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
                      >
                        <Sparkles className="w-5 h-5" />
                        Identify Part
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={resetAnalysis}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Start Over
              </button>
              
              {analysisResult && (
                <button
                  onClick={analyzeImage}
                  disabled={isAnalyzing}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Re-analyze
                </button>
              )}
              
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-2">How It Works</h3>
        <ul className="list-disc list-inside text-blue-800 space-y-2">
          <li>Take a photo or upload a clear image of a car part</li>
          <li>Our AI analyzes the image to identify the part type, brand, and specifications</li>
          <li>Get compatible vehicle models and detailed part information</li>
          <li>Find recommended replacement parts in our catalog</li>
        </ul>
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
          <p><strong>Tip:</strong> Press the Escape key or click the X button to close this screen at any time.</p>
        </div>
      </div>
    </div>
  );
}