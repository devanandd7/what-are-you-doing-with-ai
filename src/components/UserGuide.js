import React, { useState } from 'react';
import { 
  HelpCircle, X, Camera, Play, Square, Monitor, MessageCircle, 
  Settings, Save, Download, Eye, Mic, Volume2, ScreenShare,
  ChevronRight, ChevronDown, Info, Lightbulb, Zap, Smartphone,
  CheckCircle, AlertCircle
} from 'lucide-react';

const UserGuide = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');

  const sections = {
    overview: {
      title: 'What is this app?',
      icon: <Info className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            This is an <strong>AI-powered Camera Studio</strong> that captures photos and analyzes them using advanced AI. 
            Perfect for students, professionals, and anyone who wants intelligent analysis of their activities.
          </p>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2">Why use this app?</h4>
            <ul className="text-blue-700 space-y-1 text-sm">
              <li>• Get AI help with studying and homework</li>
              <li>• Monitor your work sessions automatically</li>
              <li>• Capture and analyze screen content</li>
              <li>• Voice interaction with AI assistant</li>
              <li>• Save and organize your photo collections</li>
            </ul>
          </div>
        </div>
      )
    },
    buttons: {
      title: 'Button Guide',
      icon: <Camera className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <Camera className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-800">Capture Photo</h4>
                <p className="text-sm text-blue-700">Takes a single photo from your camera. AI will analyze what you're doing.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
              <Play className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-purple-800">Start Live Action</h4>
                <p className="text-sm text-purple-700">Automatically captures photos every few seconds. Great for monitoring study sessions!</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <ScreenShare className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-green-800">Share Screen</h4>
                <p className="text-sm text-green-700">Captures your computer screen along with camera. Perfect for coding or document work.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
              <MessageCircle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-orange-800">Voice Chat</h4>
                <p className="text-sm text-orange-700">Talk to the AI! Ask questions about what you're studying or get help.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg">
              <Zap className="w-5 h-5 text-indigo-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-indigo-800">Analyze Now</h4>
                <p className="text-sm text-indigo-700">Get instant AI analysis of current camera and screen content.</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    examples: {
      title: 'Usage Examples',
      icon: <Lightbulb className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h4 className="font-semibold text-yellow-800 mb-2">📚 For Students</h4>
              <p className="text-sm text-yellow-700 mb-2">
                <strong>Scenario:</strong> You're studying math problems
              </p>
              <ol className="text-sm text-yellow-700 space-y-1 ml-4">
                <li>1. Point camera at your textbook/notes</li>
                <li>2. Click "Capture Photo" or use "Voice Chat"</li>
                <li>3. AI will help solve problems and explain concepts</li>
                <li>4. Use "Live Action" to monitor your study session</li>
              </ol>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-800 mb-2">💻 For Developers</h4>
              <p className="text-sm text-green-700 mb-2">
                <strong>Scenario:</strong> You're coding and need help
              </p>
              <ol className="text-sm text-green-700 space-y-1 ml-4">
                <li>1. Enable "Share Screen" to capture your code</li>
                <li>2. Use "Voice Chat" to ask about errors</li>
                <li>3. AI analyzes both your screen and explains solutions</li>
                <li>4. Save sessions for later review</li>
              </ol>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">🎯 For Productivity</h4>
              <p className="text-sm text-blue-700 mb-2">
                <strong>Scenario:</strong> Track your work habits
              </p>
              <ol className="text-sm text-blue-700 space-y-1 ml-4">
                <li>1. Set up "Live Action" with custom intervals</li>
                <li>2. Let it run during work sessions</li>
                <li>3. Review AI analysis of your productivity patterns</li>
                <li>4. Save collections to track progress over time</li>
              </ol>
            </div>
          </div>
        </div>
      )
    },
    tips: {
      title: 'Pro Tips',
      icon: <Settings className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-1">🎯 Best Camera Position</h4>
              <p className="text-sm text-gray-600">Position camera to clearly show your work area, books, or screen for better AI analysis.</p>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-1">⚡ Live Action Settings</h4>
              <p className="text-sm text-gray-600">Use 15-30 second intervals for study sessions, 5-10 seconds for detailed monitoring.</p>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-1">🗣️ Voice Chat Tips</h4>
              <p className="text-sm text-gray-600">Speak clearly and ask specific questions like "Help me solve this math problem" or "Explain this code error".</p>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-1">💾 Save Collections</h4>
              <p className="text-sm text-gray-600">Name your collections descriptively (e.g., "Math_Study_Session_Jan15") for easy organization.</p>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-1">🌙 Late Night Mode</h4>
              <p className="text-sm text-gray-600">AI automatically switches to friendly, caring tone after 10 PM to encourage healthy study habits.</p>
            </div>
          </div>
        </div>
      )
    },
    mobile: {
      title: 'Mobile Support',
      icon: <Smartphone className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <h4 className="font-semibold text-orange-800 mb-2">📱 Mobile Device Compatibility</h4>
            <p className="text-sm text-orange-700 mb-3">
              This app works on mobile devices, but some features have limitations:
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-sm font-medium text-green-800">Camera Capture:</span>
                  <span className="text-sm text-green-700"> Fully supported on all mobile devices</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-sm font-medium text-yellow-800">Screen Sharing:</span>
                  <span className="text-sm text-yellow-700"> Limited support - works best on Chrome/Firefox Android or Safari iOS</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-sm font-medium text-yellow-800">Voice Chat:</span>
                  <span className="text-sm text-yellow-700"> May have limited support on some mobile browsers</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-1">📱 Mobile Screen Sharing Tips</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Use Chrome 72+ or Firefox 66+ on Android</li>
                <li>• Use Safari on iOS 11+</li>
                <li>• Make sure you're using HTTPS or localhost</li>
                <li>• Allow screen sharing when prompted</li>
                <li>• Try sharing a specific tab instead of entire screen</li>
                <li>• If screen sharing fails, use camera capture instead</li>
              </ul>
            </div>
            
            <div className="p-3 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-1">📸 Mobile Camera Tips</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Hold device steady for better image quality</li>
                <li>• Ensure good lighting for clearer photos</li>
                <li>• Position camera to show your work clearly</li>
                <li>• Use landscape mode for wider shots</li>
                <li>• Keep device charged during long sessions</li>
              </ul>
            </div>
            
            <div className="p-3 bg-purple-50 rounded-lg">
              <h4 className="font-semibold text-purple-800 mb-1">🔧 Mobile Performance</h4>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>• Close other apps for better performance</li>
                <li>• Use WiFi for faster uploads</li>
                <li>• Images are automatically optimized for mobile</li>
                <li>• Live Action uses mobile-optimized settings</li>
                <li>• Collections are saved locally on your device</li>
              </ul>
            </div>
          </div>
        </div>
      )
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-200 transform hover:scale-110 z-50"
        title="Need help? Click for user guide"
      >
        <HelpCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">AI Camera Studio Guide</h2>
              <p className="text-blue-100 mt-1">Learn how to use this powerful AI-powered camera tool</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Sidebar */}
          <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
            <nav className="space-y-2">
              {Object.entries(sections).map(([key, section]) => (
                <button
                  key={key}
                  onClick={() => setActiveSection(key)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                    activeSection === key
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {section.icon}
                  <span className="font-medium">{section.title}</span>
                  {activeSection === key ? (
                    <ChevronDown className="w-4 h-4 ml-auto" />
                  ) : (
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-6">
                {sections[activeSection].icon}
                <h3 className="text-2xl font-bold text-gray-800">
                  {sections[activeSection].title}
                </h3>
              </div>
              {sections[activeSection].content}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 p-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Need more help? The AI responds in Hinglish and adapts to your needs!
            </p>
            <button
              onClick={() => setIsOpen(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserGuide;