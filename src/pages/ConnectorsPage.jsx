import { useState, useEffect, useContext } from "react";
import { ref, get, update } from "firebase/database";
import { db } from "../firebase";
import { AuthContext } from "../context/AuthContext";

export default function ConnectorsPage() {
  const { user } = useContext(AuthContext);

  const [connectors, setConnectors] = useState([]);
  const [stats, setStats] = useState({
    uploaded: 0,
    invited: 0,
    joined: 0
  });

  // 🔹 LOAD CONNECTORS DATA
  useEffect(() => {
    if (!user?.uid) return;

    const loadData = async () => {
      const snap = await get(ref(db, "connectors"));
      if (!snap.exists()) return;

      const data = [];
      snap.forEach(child => {
        data.push({ id: child.key, ...child.val() });
      });

      setConnectors(data);

      // 📊 My Stats
      const my = data.filter(c => c.uploadedBy === user.uid);

      setStats({
        uploaded: my.length,
        invited: my.filter(c => c.invitedBy === user.uid).length,
        joined: my.filter(c => c.joinedUserId).length
      });
    };

    loadData();
  }, [user]);

  // 📱 CONTACT PICKER
  const pickContacts = async () => {
    if (!("contacts" in navigator) || !("ContactsManager" in window)) {
      alert("Contact picker not supported");
      return;
    }

    const props = ["name", "tel"];
    const opts = { multiple: true };

    const picked = await navigator.contacts.select(props, opts);

    const now = Date.now();

    const updates = {};

    picked.forEach(c => {
      const mobile = c.tel?.[0]?.replace(/\D/g, "");
      if (!mobile) return;

      updates[`connectors/${mobile}`] = {
        name: c.name?.[0] || "Unknown",
        mobile,
        uploadedBy: user.uid,
        uploadedAt: now,
        creditUntil: now + 7 * 24 * 60 * 60 * 1000
      };
    });

    await update(ref(db), updates);

    alert("Contacts uploaded");
    window.location.reload();
  };

  // 📩 SEND INVITE
  const sendInvite = async (contact) => {
    const message =
      `You are invited to join our community app.\n` +
      `Register here: https://yourapp.com/register`;

    window.open(
      `https://wa.me/${contact.mobile}?text=${encodeURIComponent(message)}`,
      "_blank"
    );

    await update(ref(db, `connectors/${contact.id}`), {
      invitedBy: user.uid,
      invitedAt: Date.now()
    });
  };

  // 🔹 FILTER INVITABLE CONTACTS
  const invitable = connectors.filter(c => {
    const now = Date.now();

    return (
      !c.joinedUserId &&
      (!c.invitedAt || now > c.invitedAt + 7 * 24 * 60 * 60 * 1000)
    );
  });

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">

      {/* 🏆 HEADER */}
      <div className="bg-white p-4 rounded shadow text-center">
        <h1 className="text-xl font-bold text-blue-900">
          🏆 Oswal Connectors Competition
        </h1>

        <p className="text-sm text-gray-600 mt-2">
          સમાજના સભ્યોને એપમાં જોડવામાં મદદ કરો 🤝
          <br />
          Top Connectors ને સન્માન આપવામાં આવશે.
        </p>
      </div>

      {/* 📊 MY STATS */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-2">My Performance</h3>

        <div className="grid grid-cols-3 text-center text-sm">
          <div>
            <p className="font-bold text-blue-600">{stats.uploaded}</p>
            <p>Uploaded</p>
          </div>
          <div>
            <p className="font-bold text-green-600">{stats.invited}</p>
            <p>Invited</p>
          </div>
          <div>
            <p className="font-bold text-purple-600">{stats.joined}</p>
            <p>Joined</p>
          </div>
        </div>
      </div>

      {/* 📱 UPLOAD CONTACTS */}
      <div className="bg-white p-4 rounded shadow">
        <button
          onClick={pickContacts}
          className="w-full bg-blue-600 text-white p-2 rounded"
        >
          📱 Add Contacts from Phone
        </button>
      </div>

      {/* 📩 INVITE LIST */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-2">
          Invite Contacts ({invitable.length})
        </h3>

        {invitable.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No contacts available for invitation.
          </p>
        ) : (
          invitable.map(c => (
            <div key={c.id} className="flex justify-between border-b py-2">
              <div>
                <p>{c.name}</p>
                <p className="text-sm text-gray-600">{c.mobile}</p>
              </div>

              <button
                onClick={() => sendInvite(c)}
                className="text-green-600 text-xs border px-2 rounded"
              >
                Invite
              </button>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
