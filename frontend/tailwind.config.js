/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#3B82F6',
                    50: '#EBF2FE',
                    100: '#D7E6FD',
                    200: '#B0CDFB',
                    300: '#88B4F9',
                    400: '#609BF7',
                    500: '#3B82F6',
                    600: '#0B61EE',
                    700: '#084BB8',
                    800: '#063682',
                    900: '#03204C',
                },
                accent: {
                    purple: '#8B5CF6',
                    teal: '#14B8A6',
                },
                surface: {
                    dark: '#111827',
                    card: '#1F2937',
                    border: '#374151',
                },
                status: {
                    success: '#10B981',
                    warning: '#F59E0B',
                    error: '#EF4444',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                'glow': '0 0 20px rgba(59, 130, 246, 0.5)',
                'glow-purple': '0 0 20px rgba(139, 92, 246, 0.5)',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }
        },
    },
    plugins: [],
}
