export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">404 - Pagina Non Trovata</h1>
        <p className="text-gray-600 mb-8">
          La pagina che stai cercando non esiste.
        </p>
        <a 
          href="/" 
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
        >
          Torna alla Home
        </a>
      </div>
    </div>
  )
}