import React, { useState, useEffect } from 'react';
import {
    loginAdmin,
    getPendingTracks, getTrackDetails, approveTrack, rejectTrack, resolveAssetUrl,
    getAuthorRequests, approveAuthor, rejectAuthor,
    createGenreFast
} from './api';
import './App.css';

const getByPath = (source, path) => {
    if (!source) return undefined;
    const parts = path.split('.');
    let current = source;
    for (const part of parts) {
        if (current === null || current === undefined) return undefined;
        current = current[part];
    }
    return current;
};

const pickFirstString = (source, keys) => {
    if (!source) return '';
    for (const key of keys) {
        const value = key.includes('.') ? getByPath(source, key) : source[key];
        if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
};

const formatMetaValue = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.length ? value.join(', ') : '-';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
};

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

function TrackDetails({ track, detailsError, onBack, onApprove, onReject }) {
    const coverFileId = pickFirstString(track, [
        'coverFileId', 'coverId', 'imageFileId', 'artworkFileId', 'cover.fileId', 'image.fileId'
    ]);
    const audioFileId = pickFirstString(track, [
        'audioFileId', 'fileId', 'trackFileId', 'musicFileId', 'audio.fileId', 'file.fileId'
    ]);

    const coverUrl = resolveAssetUrl(pickFirstString(track, [
        'coverUrl', 'coverImageUrl', 'imageUrl', 'artworkUrl', 'pictureUrl', 'photoUrl', 'thumbnailUrl',
        'cover.url', 'cover.path', 'image.url', 'image.path', 'artwork.url', 'artwork.path'
    ])) || resolveAssetUrl(track?.id ? `/api/Tracks/${track.id}/cover` : '') || resolveAssetUrl(coverFileId ? `/files/${coverFileId}` : '');

    const audioUrl = resolveAssetUrl(pickFirstString(track, [
        'audioUrl', 'fileUrl', 'trackUrl', 'songUrl', 'url', 'musicUrl', 'mp3Url', 'sourceUrl',
        'audio.url', 'audio.path', 'file.url', 'file.path'
    ])) || resolveAssetUrl(track?.id ? `/api/Tracks/stream/${track.id}` : '') || resolveAssetUrl(audioFileId ? `/files/${audioFileId}` : '');
    const attachedText = pickFirstString(track, [
        'lyrics', 'lyricsText', 'text', 'description', 'caption', 'about', 'message', 'trackText'
    ]);
    const skipFields = new Set([
        'coverUrl', 'coverImageUrl', 'imageUrl', 'artworkUrl', 'pictureUrl', 'photoUrl', 'thumbnailUrl',
        'cover', 'image', 'artwork',
        'audioUrl', 'fileUrl', 'trackUrl', 'songUrl', 'url', 'musicUrl', 'mp3Url', 'sourceUrl',
        'audio', 'file',
        'lyrics', 'lyricsText', 'text', 'description', 'caption', 'about', 'message', 'trackText'
    ]);

    return (
        <div className="track-details-page">
            <button className="btn-secondary" onClick={onBack}>Back to tracks</button>
            <h3>Track Review</h3>
            {detailsError && <div className="error-msg">{detailsError}</div>}

            <div className="track-details-grid">
                <div className="track-media-card">
                    <h4>Cover</h4>
                    {coverUrl ? (
                        <a href={coverUrl} target="_blank" rel="noreferrer">
                            <img className="track-cover-large" src={coverUrl} alt={track.title || 'Track cover'} />
                        </a>
                    ) : (
                        <div className="placeholder-box">No cover image</div>
                    )}

                    <h4>Audio</h4>
                    {audioUrl ? (
                        <audio controls preload="none" src={audioUrl} className="track-audio-player">
                            Your browser does not support audio playback.
                        </audio>
                    ) : (
                        <div className="placeholder-box">No audio file attached</div>
                    )}
                </div>

                <div className="track-info-card">
                    <h4>Track info</h4>
                    <div className="track-main-info">
                        <p><strong>Title:</strong> {track.title || '-'}</p>
                        <p><strong>Artist:</strong> {track.artistName || '-'}</p>
                        <p><strong>Uploader:</strong> {track.ownerUsername || '-'}</p>
                    </div>

                    <h4>Attached text</h4>
                    <p className="track-text">{attachedText || 'No text attached to this track.'}</p>

                    <h4>Metadata</h4>
                    <div className="meta-list">
                        {Object.entries(track)
                            .filter(([key]) => !skipFields.has(key))
                            .map(([key, value]) => (
                                <div key={key} className="meta-item">
                                    <span>{key}</span>
                                    <strong>{formatMetaValue(value)}</strong>
                                </div>
                            ))}
                    </div>
                </div>
            </div>

            <div className="track-detail-actions">
                <button className="btn-green" onClick={() => onApprove(track.id)}>Approve</button>
                <button className="btn-red" onClick={() => onReject(track.id)}>Reject</button>
            </div>
        </div>
    );
}

function TracksManager() {
    const [tracks, setTracks] = useState([]);
    const [selectedTrack, setSelectedTrack] = useState(null);
    const [detailsError, setDetailsError] = useState('');
    const [loadingTrackId, setLoadingTrackId] = useState(null);

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
        if (selectedTrack?.id === id) setSelectedTrack(null);
        setDetailsError('');
        load();
    };

    const handleReject = async (id) => {
        if(!confirm('Reject (Delete) this track?')) return;
        await rejectTrack(id);
        if (selectedTrack?.id === id) setSelectedTrack(null);
        setDetailsError('');
        load();
    };

    const openTrackDetails = async (track) => {
        setLoadingTrackId(track.id);
        setDetailsError('');
        try {
            const detailed = await getTrackDetails(track.id);
            setSelectedTrack({ ...track, ...detailed });
        } catch (e) {
            setSelectedTrack(track);
            setDetailsError('Could not load full track details from backend endpoint. Check admin track-details API response.');
        } finally {
            setLoadingTrackId(null);
        }
    };

    if (selectedTrack) {
        return (
            <TrackDetails
                track={selectedTrack}
                detailsError={detailsError}
                onBack={() => setSelectedTrack(null)}
                onApprove={handleApprove}
                onReject={handleReject}
            />
        );
    }

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
                                <button className="btn-blue" onClick={() => openTrackDetails(t)} disabled={loadingTrackId === t.id}>
                                    {loadingTrackId === t.id ? 'Loading...' : 'View details'}
                                </button>
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
