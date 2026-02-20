import { useState, useEffect } from "react";
import { ref, get } from "firebase/database";
import { db } from "../firebase";
import { Trophy, Medal, Award } from "lucide-react";

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        setLoading(true);
        
        // Fetch all connectors
        const connectorsSnap = await get(ref(db, "connectors"));
        
        if (!connectorsSnap.exists()) {
          setLeaderboard([]);
          setLoading(false);
          return;
        }

        // Group by uploadedBy and calculate scores
        const userScores = {};
        
        connectorsSnap.forEach(child => {
          const data = child.val();
          const userId = data.uploadedBy;
          
          if (!userId) return; // Skip if no uploader
          
          if (!userScores[userId]) {
            userScores[userId] = {
              userId,
              uploaded: 0,
              invited: 0,
              joined: 0,
              score: 0
            };
          }
          
          // Count uploaded contacts
          userScores[userId].uploaded++;
          userScores[userId].score += 1; // 1 point per upload
          
          // Count invites sent
          if (data.invitedBy === userId) {
            userScores[userId].invited++;
            userScores[userId].score += 2; // 2 points per invite
          }
          
          // Count successful joins
          if (data.joinedUserId) {
            userScores[userId].joined++;
            userScores[userId].score += 10; // 10 points per successful join
          }
        });

        // Fetch user names from users node
        const usersSnap = await get(ref(db, "users"));
        const users = usersSnap.val() || {};

        // Convert to array, add names, and sort by score
        const sorted = Object.values(userScores)
          .map(score => ({
            ...score,
            name: users[score.userId]?.name || "Unknown User",
            email: users[score.userId]?.email || ""
          }))
          .sort((a, b) => b.score - a.score);

        setLeaderboard(sorted);
        setLoading(false);
      } catch (err) {
        console.error("Error loading leaderboard:", err);
        setError("Failed to load leaderboard. Please try again.");
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-4 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 text-blue-600 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-lg p-6 mb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Trophy size={32} />
          <h1 className="text-2xl font-bold">Leaderboard</h1>
        </div>
        <p className="text-center text-blue-100 text-sm">
          🏆 Oswal Connectors Competition
        </p>
      </div>

      {/* Scoring System Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <Award size={18} />
          Scoring System
        </h3>
        <div className="text-sm space-y-1 text-gray-700">
          <div className="flex justify-between">
            <span>Upload contact:</span>
            <strong className="text-blue-600">+1 point</strong>
          </div>
          <div className="flex justify-between">
            <span>Send invite:</span>
            <strong className="text-green-600">+2 points</strong>
          </div>
          <div className="flex justify-between">
            <span>Successful join:</span>
            <strong className="text-purple-600">+10 points</strong>
          </div>
        </div>
      </div>

      {/* Leaderboard List */}
      {leaderboard.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Trophy size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600">No participants yet</p>
          <p className="text-sm text-gray-500 mt-2">
            Be the first to upload contacts!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {leaderboard.map((user, index) => {
            const isTop3 = index < 3;
            const bgColor = 
              index === 0 ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-400' :
              index === 1 ? 'bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-400' :
              index === 2 ? 'bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-400' :
              'bg-white border border-gray-200';

            return (
              <div 
                key={user.userId}
                className={`${bgColor} rounded-lg shadow-md p-4 transition-all hover:shadow-lg`}
              >
                <div className="flex justify-between items-center">
                  {/* Rank and Name */}
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex-shrink-0">
                      {index === 0 && (
                        <div className="text-3xl">🥇</div>
                      )}
                      {index === 1 && (
                        <div className="text-3xl">🥈</div>
                      )}
                      {index === 2 && (
                        <div className="text-3xl">🥉</div>
                      )}
                      {index > 2 && (
                        <div className={`w-10 h-10 rounded-full ${
                          index < 10 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                        } flex items-center justify-center font-bold`}>
                          {index + 1}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">
                        {user.name}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        <span className="inline-block mr-2">
                          📤 {user.uploaded}
                        </span>
                        <span className="inline-block mr-2">
                          📨 {user.invited}
                        </span>
                        <span className="inline-block">
                          ✅ {user.joined}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right flex-shrink-0 ml-4">
                    <div className={`text-2xl font-bold ${
                      index === 0 ? 'text-yellow-600' :
                      index === 1 ? 'text-gray-600' :
                      index === 2 ? 'text-orange-600' :
                      'text-blue-600'
                    }`}>
                      {user.score}
                    </div>
                    <div className="text-xs text-gray-500">points</div>
                  </div>
                </div>

                {/* Detailed breakdown for top 3 */}
                {isTop3 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <div className="text-gray-600">Uploaded</div>
                      <div className="font-semibold text-blue-600">
                        {user.uploaded} × 1 = {user.uploaded}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Invited</div>
                      <div className="font-semibold text-green-600">
                        {user.invited} × 2 = {user.invited * 2}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Joined</div>
                      <div className="font-semibold text-purple-600">
                        {user.joined} × 10 = {user.joined * 10}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Total Participants */}
      {leaderboard.length > 0 && (
        <div className="mt-6 text-center text-sm text-gray-600">
          Total Participants: <strong>{leaderboard.length}</strong>
        </div>
      )}

      {/* Refresh Button */}
      <div className="mt-6 text-center">
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow hover:bg-blue-700 transition-colors"
        >
          🔄 Refresh Rankings
        </button>
      </div>
    </div>
  );
}
