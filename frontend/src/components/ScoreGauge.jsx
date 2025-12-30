export default function ScoreGauge({ score = 0 }) {
    const getColor = () => {
        if (score >= 80) return '#10B981' // success
        if (score >= 60) return '#F59E0B' // warning
        return '#EF4444' // error
    }

    const getLabel = () => {
        if (score >= 80) return 'Good'
        if (score >= 60) return 'Needs Improvement'
        return 'Poor'
    }

    const circumference = 2 * Math.PI * 45
    const strokeDashoffset = circumference - (score / 100) * circumference

    return (
        <div className="relative w-32 h-32">
            <svg className="transform -rotate-90 w-32 h-32">
                {/* Background circle */}
                <circle
                    cx="64"
                    cy="64"
                    r="45"
                    stroke="#374151"
                    strokeWidth="8"
                    fill="none"
                />
                {/* Progress circle */}
                <circle
                    cx="64"
                    cy="64"
                    r="45"
                    stroke={getColor()}
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                    style={{
                        filter: `drop-shadow(0 0 8px ${getColor()})`
                    }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-white">{score}</span>
                <span className="text-xs text-gray-400">{getLabel()}</span>
            </div>
        </div>
    )
}
