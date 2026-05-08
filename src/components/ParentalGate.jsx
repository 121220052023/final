import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, X, AlertTriangle } from 'lucide-react'

const ParentalGate = ({ isOpen, onClose, onUnlock, title = 'Parental Control' }) => {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  const handleDigit = (digit) => {
    if (pin.length < 4) {
      const newPin = pin + digit
      setPin(newPin)
      if (newPin.length === 4) {
        setTimeout(() => {
          if (onUnlock(newPin)) {
            setPin('')
            setError('')
          } else {
            setError('Incorrect PIN')
            setPin('')
          }
        }, 200)
      }
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-card backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-card rounded-2xl p-8 max-w-sm w-full"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                </div>
                <h3 className="text-lg font-bold text-foreground">{title}</h3>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-muted-foreground text-sm mb-6">
              Enter your 4-digit PIN to continue
            </p>

            <div className="flex justify-center gap-3 mb-6">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full  transition-all ${
                    i < pin.length
                      ? 'bg-purple-500 -500'
                      : ''
                  }`}
                />
              ))}
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center mb-4">{error}</p>
            )}

            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handleDigit(digit.toString())}
                  className="py-4 bg-muted hover:bg-muted/80 rounded-xl text-xl font-bold text-foreground transition-all"
                >
                  {digit}
                </button>
              ))}
              <div />
              <button
                onClick={() => handleDigit('0')}
                className="py-4 bg-muted hover:bg-muted/80 rounded-xl text-xl font-bold text-foreground transition-all"
              >
                0
              </button>
              <button
                onClick={() => setPin(pin.slice(0, -1))}
                className="py-4 bg-muted hover:bg-muted/80 rounded-xl text-sm font-medium text-muted-foreground transition-all"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ParentalGate
