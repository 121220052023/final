import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone, Download, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function AppQRModal({ isOpen, onClose }) {
  const appUrl = 'https://ocean-of-movies-pi.vercel.app/download';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={e => e.stopPropagation()}
            className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl"
          >
            <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Smartphone className="w-7 h-7 text-white" />
            </div>

            <h3 className="text-xl font-bold text-foreground mb-1">Get the Mobile App</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Scan with your phone to download
            </p>

            <div className="bg-white p-4 rounded-xl inline-block mx-auto mb-6 shadow-sm">
              <QRCodeSVG value={appUrl} size={180} level="M" />
            </div>

            <div className="space-y-3">
              <a
                href={appUrl}
                className="flex items-center justify-center gap-2 w-full bg-primary text-white rounded-xl py-3 font-semibold hover:bg-primary/90 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download APK
              </a>
              <p className="text-xs text-muted-foreground">
                Available for Android. iOS version coming soon.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
