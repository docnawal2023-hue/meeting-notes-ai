import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../api";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/Spinner";

export default function Dashboard() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/meetings")
      .then((res) => setMeetings(res.data.meetings))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800">Hello, {user.name}</h1>
      <p className="text-slate-500 mb-6">Your meetings will appear here.</p>

      {loading && <Spinner />}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && meetings.length === 0 && (
        <div className="rounded-xl bg-white border border-dashed border-slate-300 p-10 text-center text-slate-500">
          No meetings yet.
        </div>
      )}

      <ul className="space-y-2">
        {meetings.map((m) => (
          <li key={m._id} className="rounded-lg bg-white border border-slate-200 px-4 py-3 flex justify-between">
            <span className="font-medium text-slate-700">{m.title}</span>
            <span className="text-sm text-slate-500">{m.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}