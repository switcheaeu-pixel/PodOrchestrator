export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center">
        <h1 className="text-3xl font-bold text-green-600 mb-4">✅ Test Page Working!</h1>
        <p className="text-gray-700 mb-6">
          If you can see this page, the PodOrchestrator is working correctly on Vercel.
        </p>
        <div className="space-y-4 text-left">
          <div className="p-3 bg-green-50 rounded-lg">
            <span className="font-semibold">Status:</span> Online
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <span className="font-semibold">Next.js Version:</span> 14.2.0
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <span className="font-semibold">App Router:</span> Active
          </div>
        </div>
        <a 
          href="/" 
          className="mt-6 inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          Go to Home Page
        </a>
      </div>
    </div>
  )
}