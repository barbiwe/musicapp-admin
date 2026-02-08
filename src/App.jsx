import React, { useState, useEffect } from 'react';
import {
    loginAdmin,
    getPendingTracks, approveTrack, rejectTrack,
    getAuthorRequests, approveAuthor, rejectAuthor,
    createGenreFast
} from './api';
import './App.css';

/* === LOGIN COMPONENT === */
function Login({ onLogin }) {
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        const res = await loginAdmin(email, pass);
        if (res.token) {
            onLogin();
        } else {
            setError(res.error || 'Login failed');
        }
    };

    return (
        <div className="login-container">
            <form className="login-box" onSubmit={handleLogin}>
                <h2>Admin Panel</h2> {/* Прибрали 🔒 */}
                {error && <div className="error-msg">{error}</div>}
                <input placeholder="Email" onChange={e => setEmail(e.target.value)} />
                <input type="password" placeholder="Password" onChange={e => setPass(e.target.value)} />
                <button type="submit">Sign In</button>
            </form>
        </div>
    );
}

/* === TABS COMPONENTS === */

function TracksManager() {
    const [tracks, setTracks] = useState([]);

    useEffect(() => { load(); }, []);

    const load = async () => {
        try {
            const data = await getPendingTracks();
            setTracks(data);
        } catch(e) { console.log('Error loading tracks'); }
    };

    const handleApprove = async (id) => {
        if(!confirm('Approve this track?')) return;
        await approveTrack(id);
        load();
    };

    const handleReject = async (id) => {
        if(!confirm('Reject (Delete) this track?')) return;
        await rejectTrack(id);
        load();
    };

    return (
        <div>
            <h3>Pending Tracks ({tracks.length})</h3> {/* Прибрали 🎵 */}
            {tracks.length === 0 ? <p>No pending tracks.</p> : (
                <table className="data-table">
                    <thead>
                    <tr>
                        <th>Title</th>
                        <th>Artist</th>
                        <th>Uploader</th>
                        <th>Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {tracks.map(t => (
                        <tr key={t.id}>
                            <td>{t.title}</td>
                            <td>{t.artistName}</td>
                            <td>{t.ownerUsername}</td>
                            <td>
                                <button className="btn-green" onClick={() => handleApprove(t.id)}>Approve</button>
                                <button className="btn-red" onClick={() => handleReject(t.id)}>Reject</button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

function AuthorsManager() {
    const [requests, setRequests] = useState([]);

    useEffect(() => { load(); }, []);

    const load = async () => {
        try {
            const data = await getAuthorRequests();
            setRequests(data);
        } catch(e) { console.log('Error loading requests'); }
    };

    const handleApprove = async (id) => {
        await approveAuthor(id);
        load();
    };

    const handleReject = async (id) => {
        await rejectAuthor(id);
        load();
    };

    return (
        <div>
            <h3>Artist Requests ({requests.length})</h3> {/* Прибрали 🎤 */}
            {requests.length === 0 ? <p>No pending requests.</p> : (
                <table className="data-table">
                    <thead>
                    <tr>
                        <th>Current User</th>
                        <th>Requested Name</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {requests.map(r => (
                        <tr key={r.id}>
                            <td>{r.currentUsername}</td>
                            <td>{r.requestedUsername}</td>
                            <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                            <td>
                                <button className="btn-green" onClick={() => handleApprove(r.id)}>Approve</button>
                                <button className="btn-red" onClick={() => handleReject(r.id)}>Reject</button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

function GenreManager() {
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');

    const handleCreate = async () => {
        if(!name || !slug) return alert('Fill both fields');
        try {
            await createGenreFast(name, slug);
            alert('Genre created!');
            setName(''); setSlug('');
        } catch(e) {
            alert('Error creating genre');
        }
    };

    return (
        <div className="form-box">
            <h3>Create Genre</h3> {/* Прибрали 🏷️ */}
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Name (e.g. Hip Hop)" />
            <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="Slug (e.g. hip-hop)" />
            <button onClick={handleCreate}>Create Genre</button>
        </div>
    );
}

/* === MAIN APP === */
function App() {
    const [token, setToken] = useState(localStorage.getItem('adminToken'));
    const [tab, setTab] = useState('tracks');

    if (!token) {
        return <Login onLogin={() => setToken(localStorage.getItem('adminToken'))} />;
    }

    return (
        <div className="app-layout">
            <div className="sidebar">
                <h2>MussicAdmin</h2>
                <nav>
                    <button className={tab === 'tracks' ? 'active' : ''} onClick={() => setTab('tracks')}>Pending Tracks</button>
                    <button className={tab === 'authors' ? 'active' : ''} onClick={() => setTab('authors')}>Artist Requests</button>
                    <button className={tab === 'genres' ? 'active' : ''} onClick={() => setTab('genres')}>Genres</button>
                </nav>
                <button className="logout-btn" onClick={() => { localStorage.clear(); setToken(null); }}>Logout</button>
            </div>

            <div className="content">
                {tab === 'tracks' && <TracksManager />}
                {tab === 'authors' && <AuthorsManager />}
                {tab === 'genres' && <GenreManager />}
            </div>
        </div>
    );
}

export default App;