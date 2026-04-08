export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Simple Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg"></div>
              <span className="text-xl font-bold text-gray-900">PodOrchestrator</span>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#" className="text-gray-700 hover:text-blue-600">Home</a>
              <a href="#" className="text-gray-700 hover:text-blue-600">Funzionalità</a>
              <a href="#" className="text-gray-700 hover:text-blue-600">Prezzi</a>
              <a href="#" className="text-gray-700 hover:text-blue-600">Login</a>
            </nav>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
              Inizia Gratis
            </button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="text-center py-16">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Crea Podcast con l'<span className="text-blue-600">Intelligenza Artificiale</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            La prima piattaforma italiana che trasforma le tue idee in podcast professionali 
            utilizzando l'AI. Nessuna attrezzatura, nessuna competenza tecnica richiesta.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg text-lg transition duration-300">
              Inizia Gratis
            </button>
            <button className="bg-white hover:bg-gray-50 text-gray-800 font-semibold py-3 px-8 rounded-lg text-lg border border-gray-300 transition duration-300">
              Guarda Demo
            </button>
          </div>
        </section>

        {/* Podcast Creator Demo */}
        <section className="py-12">
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Provalo Ora
            </h2>
            <p className="text-gray-600 mb-8">
              Crea il tuo primo podcast in italiano in pochi minuti
            </p>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <div className="text-gray-500 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <p className="text-gray-700">Podcast Creator Component - Da implementare</p>
              <button className="mt-4 bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-6 rounded-lg">
                Avvia Creazione
              </button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Funzionalità Principali
            </h2>
            <p className="text-xl text-gray-600">
              Tutto ciò di cui hai bisogno per creare podcast straordinari
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-lg">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-blue-600 text-2xl">{feature.icon}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Piani e Prezzi
            </h2>
            <p className="text-xl text-gray-600">
              Scegli il piano perfetto per le tue esigenze
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {pricingTiers.map((tier, index) => (
              <div key={index} className={`bg-white rounded-xl shadow-lg p-6 ${tier.highlight ? 'border-2 border-blue-500' : ''}`}>
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">{tier.name}</h3>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    {tier.price !== 'Gratis' && <span className="text-gray-600">/mese</span>}
                  </div>
                  <p className="text-gray-600 mt-2">{tier.description}</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-center">
                      <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button className={`w-full py-3 rounded-lg font-semibold ${tier.highlight ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}>
                  {tier.buttonText}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Cosa dicono i nostri utenti
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-xl">
                      {testimonial.initials}
                    </span>
                  </div>
                  <div className="ml-4">
                    <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                    <p className="text-gray-600 text-sm">{testimonial.role}</p>
                  </div>
                </div>
                <p className="text-gray-700 italic">"{testimonial.quote}"</p>
                <div className="flex mt-4">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className="w-5 h-5 text-yellow-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Pronto a rivoluzionare il tuo podcasting?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Unisciti a centinaia di creator italiani che già utilizzano la nostra piattaforma
            </p>
            <button className="bg-white hover:bg-gray-100 text-blue-600 font-bold py-4 px-10 rounded-lg text-lg transition duration-300">
              Inizia la tua prova gratuita
            </button>
            <p className="text-blue-200 mt-4">
              Nessuna carta di credito richiesta • 1 podcast gratuito al mese
            </p>
          </div>
        </section>
      </main>

      {/* Simple Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-blue-500 rounded-lg"></div>
                <span className="text-xl font-bold">PodOrchestrator</span>
              </div>
              <p className="text-gray-400">
                La piattaforma AI per podcast italiani
              </p>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-4">Prodotto</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Funzionalità</a></li>
                <li><a href="#" className="hover:text-white">Prezzi</a></li>
                <li><a href="#" className="hover:text-white">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-4">Azienda</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Chi siamo</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Lavora con noi</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-4">Supporto</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Documentazione</a></li>
                <li><a href="#" className="hover:text-white">Contatti</a></li>
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>© 2024 PodOrchestrator. Tutti i diritti riservati.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: "🎙️",
    title: "Voci Italiane Naturali",
    description: "Voci AI che suonano come veri madrelingua italiani, con supporto per accenti regionali."
  },
  {
    icon: "🤖",
    title: "Scrittura AI in Italiano",
    description: "Genera script per podcast in italiano perfetto, ottimizzati per l'ascolto."
  },
  {
    icon: "⚡",
    title: "Produzione Rapida",
    description: "Crea podcast completi in minuti invece di ore. Ideale per contenuti frequenti."
  }
];

const pricingTiers = [
  {
    name: "Gratuito",
    price: "Gratis",
    description: "Per iniziare",
    features: ["1 podcast/mese", "Voci base italiane", "Supporto community"],
    buttonText: "Inizia Gratis",
    highlight: false
  },
  {
    name: "Creator",
    price: "€9,99",
    description: "Per creator seri",
    features: ["5 podcast/mese", "Voci premium", "Supporto email", "Nessun watermark"],
    buttonText: "Scegli Creator",
    highlight: true
  },
  {
    name: "Pro",
    price: "€29,99",
    description: "Per professionisti",
    features: ["Podcast illimitati", "Clonazione voce", "Supporto prioritario", "Analytics avanzati"],
    buttonText: "Scegli Pro",
    highlight: false
  },
  {
    name: "Business",
    price: "€99",
    description: "Per aziende",
    features: ["White-label", "API completo", "Supporto dedicato", "Personalizzazione"],
    buttonText: "Contattaci",
    highlight: false
  }
];

const testimonials = [
  {
    initials: "MC",
    name: "Marco Conti",
    role: "Podcaster Business",
    quote: "Ho ridotto il tempo di produzione del 70%. La qualità delle voci italiane è impressionante!"
  },
  {
    initials: "SG",
    name: "Sara Giordano",
    role: "Content Creator Educativo",
    quote: "Finalmente una piattaforma che capisce le sfumature della lingua italiana. I miei ascoltatori notano la differenza."
  },
  {
    initials: "LP",
    name: "Luca Pellegrini",
    role: "Azienda Tech",
    quote: "Perfetto per i nostri podcast aziendali. L'integrazione con i nostri sistemi è stata semplice."
  }
];