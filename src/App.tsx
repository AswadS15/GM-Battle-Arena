import { useState } from "react";
import Stepper, { Step } from "./assets/Stepper/Stepper";

const steps = [
  {
    title: "Login ke ETH OS",
    description: "Masuk ke halaman ETH OS dengan menggunakan wallet Anda.",
  },
  {
    title: "Verifikasi email",
    description: "Cek inbox dan klik link verifikasi email yang dikirim.",
  },
  {
    title: "Dapatkan kode",
    description: "Setelah verifikasi, kode akan muncul di dashboard Anda.",
  },
];

export default function LandingPage() {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = () => {
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#97ABF3] flex flex-col items-center justify-center p-6 font-mono relative text-[#1a1a1a]">
      {/* Logo Blur (sesuai gambar) */}
      <div className="mb-10 filter blur-[30px] opacity-30">
        <img
          src="/path-to-your-ethos-logo.png" // Ganti sesuai path logo kamu
          alt="EthOS"
          className="w-48 h-48 object-contain"
        />
      </div>

      {/* Tombol utama */}
      <button
        onClick={openModal}
        className="bg-[#c6cadf] text-white font-bold px-8 py-3 rounded border-2 border-[#424242] shadow-[4px_4px_0_0_rgba(66,66,66,1)] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all select-none"
      >
        Lihat Langkah Onboarding
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-[#2f2f2f] bg-opacity-90 flex items-center justify-center z-50 px-4">
          <div className="relative bg-[#97ABF3] rounded-lg p-8 w-4xl shadow-xl">
            {/* Tombol tutup modal */}
            <button
              onClick={closeModal}
              className="absolute top-3 right-3 text-white font-bold text-xl"
              aria-label="Close modal"
            >
              ×
            </button>

            <Stepper
              initialStep={0} // mulai dari step 0 (step pertama)
              onStepChange={(step) => {
                console.log("Current Step:", step);
              }}
              onFinalStepCompleted={() => {
                console.log("All steps completed!");
                closeModal(); // tutup modal saat selesai
              }}
              backButtonText="Previous"
              nextButtonText="Start"
            >
              <Step>
                <h2 className="text-2xl font-bold mb-4">{steps[0].title}</h2>
                <p>{steps[0].description}</p>
              </Step>
              <Step>
                <h2 className="text-2xl font-bold mb-4">{steps[1].title}</h2>
                <p>{steps[1].description}</p>
              </Step>
              <Step>
                <h2 className="text-2xl font-bold mb-4">{steps[2].title}</h2>
                <p>{steps[2].description}</p>
              </Step>
            </Stepper>
          </div>
        </div>
      )}
    </div>
  );
}
