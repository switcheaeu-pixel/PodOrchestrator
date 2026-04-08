import PodcastCreator from '@/components/PodcastCreator';
import PricingTiers from '@/components/PricingTiers';
import FeaturesShowcase from '@/components/FeaturesShowcase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Header />
      
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
            <PodcastCreator />
          </div>
        </section>

        {/* Features */}
        <section className="py-16">
          <FeaturesShowcase />
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
          <PricingTiers />
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

      <Footer />
    </div>
  );
}

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