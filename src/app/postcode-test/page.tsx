import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PostcodeTest from "@/components/PostcodeTest";

export default function PostcodeTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <div className="flex-grow container mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">
          Postcode API Test
        </h1>
        
        <div className="max-w-lg mx-auto">
          <PostcodeTest />
        </div>
        
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>
            Deze testpagina is bedoeld om te controleren of de Postcode.nl API correct werkt.
            <br />Test met een echte Nederlandse postcode en huisnummer.
          </p>
        </div>
      </div>
      
      <Footer />
    </div>
  );
} 