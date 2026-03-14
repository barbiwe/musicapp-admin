import React, { useState, useEffect } from 'react';
import {
    loginAdmin,
    getPendingTracks, getTrackDetails, approveTrack, rejectTrack, resolveAssetUrl,
    getIconMap,
    getAuthorRequests, approveAuthor, rejectAuthor,
    createGenreFast,
    uploadAd, getAllAds, deleteAd, disableAd, uploadBanner, getBanners, deleteBanner
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

const pickFirstValue = (source, keys) => {
    if (!source) return null;
    for (const key of keys) {
        const value = key.includes('.') ? getByPath(source, key) : source[key];
        if (value !== null && value !== undefined && value !== '') return value;
    }
    return null;
};

const formatMetaValue = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.length ? value.join(', ') : '-';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
};

const getStrictBackendIconUrl = (iconMap, iconKey) => {
    if (!iconMap || typeof iconMap !== 'object') return '';
    const icons = iconMap.icons;
    if (!icons || typeof icons !== 'object') return '';

    const value = icons[iconKey];
    if (typeof value === 'string' && value.trim()) {
        return resolveAssetUrl(value.trim());
    }

    if (value && typeof value === 'object') {
        const raw = value.url || value.path || value.src;
        if (typeof raw === 'string' && raw.trim()) {
            return resolveAssetUrl(raw.trim());
        }
    }

    return '';
};

const getAdImageCandidates = (adId) => {
    if (!adId) return [];
    return [resolveAssetUrl(`/api/ads/${adId}/image`)];
};

const getAdAudioUrl = (adId) => {
    if (!adId) return '';
    return resolveAssetUrl(`/api/ads/${adId}/audio`);
};

function UploadTile({ label, hint, file, accept, onPick, plusIconUrl }) {
    return (
        <label className="upload-tile">
            <input type="file" accept={accept} onChange={(e) => onPick(e.target.files?.[0] || null)} />
            <div className="upload-tile-content">
                <div className="upload-tile-icon">
                    {plusIconUrl ? <img src={plusIconUrl} alt="" /> : <span>+</span>}
                </div>
                <p className="upload-tile-title">{label}</p>
                <p className="upload-tile-hint">{file ? file.name : hint}</p>
            </div>
        </label>
    );
}

/* === LOGIN COMPONENT === */
function Login({ onLogin }) {
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [error, setError] = useState('');
    const [logoUrl, setLogoUrl] = useState('');

    useEffect(() => {
        let mounted = true;

        const loadLogo = async () => {
            const iconMap = await getIconMap();
            const strictLogoUrl = getStrictBackendIconUrl(iconMap, 'VOX2.svg');
            if (mounted) setLogoUrl(strictLogoUrl);
        };

        loadLogo();
        return () => { mounted = false; };
    }, []);

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
                <div className="login-brand">
                    <div className="logo-slot login-logo-slot">
                        {logoUrl ? (
                            <img src={logoUrl} alt="VOX" className="logo-image" onError={() => setLogoUrl('')} />
                        ) : (
                            <div className="logo-placeholder" aria-hidden="true" />
                        )}
                    </div>
                </div>
                {error && <div className="error-msg">{error}</div>}
                <input placeholder="Email" onChange={e => setEmail(e.target.value)} />
                <input type="password" placeholder="Password" onChange={e => setPass(e.target.value)} />
                <button className="btn-primary login-submit-btn" type="submit">Sign In</button>
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
    const metadataRows = [
        { label: 'Title', value: pickFirstValue(track, ['title']) },
        { label: 'ID', value: pickFirstValue(track, ['id']) },
        { label: 'Artist Name', value: pickFirstValue(track, ['artistName', 'artist.name']) },
        { label: 'Status', value: pickFirstValue(track, ['status']) },
        {
            label: 'Uploaded At',
            value: (() => {
                const raw = pickFirstValue(track, ['uploadedAt', 'createdAt']);
                if (!raw) return null;
                const parsed = new Date(raw);
                return Number.isNaN(parsed.getTime()) ? raw : parsed.toLocaleString();
            })()
        },
        { label: 'Album ID', value: pickFirstValue(track, ['albumId', 'album.id']) },
        { label: 'Genres', value: pickFirstValue(track, ['genres', 'genreNames', 'genreName']) },
    ].filter((item) => item.value !== null && item.value !== undefined && item.value !== '');

    return (
        <div className="track-details-page">
            <button className="btn-soft" onClick={onBack}>Back to tracks</button>
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
                    </div>

                    <h4>Attached text</h4>
                    <p className="track-text">{attachedText || 'No text attached to this track.'}</p>

                    <h4>Metadata</h4>
                    <div className="meta-list">
                        {metadataRows.map((item) => (
                            <div key={item.label} className="meta-item">
                                <span>{item.label}</span>
                                <strong>{formatMetaValue(item.value)}</strong>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="track-detail-actions">
                <button className="btn-primary" onClick={() => onApprove(track.id)}>Approve</button>
                <button className="btn-danger" onClick={() => onReject(track.id)}>Reject</button>
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
        <div className="panel">
            <h3>Pending Tracks ({tracks.length})</h3>
            {tracks.length === 0 ? <div className="status-card">No pending tracks.</div> : (
                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                        <tr>
                            <th>Title</th>
                            <th>Artist</th>
                            <th>Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {tracks.map(t => (
                            <tr key={t.id}>
                                <td>{t.title}</td>
                                <td>{t.artistName}</td>
                                <td>
                                    <button className="btn-soft" onClick={() => openTrackDetails(t)} disabled={loadingTrackId === t.id}>
                                        {loadingTrackId === t.id ? 'Loading...' : 'View details'}
                                    </button>
                                    <button className="btn-primary" onClick={() => handleApprove(t.id)}>Approve</button>
                                    <button className="btn-danger" onClick={() => handleReject(t.id)}>Reject</button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
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
        <div className="panel">
            <h3>Artist Requests ({requests.length})</h3>
            {requests.length === 0 ? <div className="status-card">No pending requests.</div> : (
                <div className="table-wrap">
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
                                    <button className="btn-primary" onClick={() => handleApprove(r.id)}>Approve</button>
                                    <button className="btn-danger" onClick={() => handleReject(r.id)}>Reject</button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
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
        <div className="panel form-box">
            <h3>Create Genre</h3>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Name (e.g. Hip Hop)" />
            <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="Slug (e.g. hip-hop)" />
            <button className="btn-primary" onClick={handleCreate}>Create Genre</button>
        </div>
    );
}

function AdsPublishManager() {
    const [title, setTitle] = useState('');
    const [targetUrl, setTargetUrl] = useState('');
    const [audioFile, setAudioFile] = useState(null);
    const [banner1File, setBanner1File] = useState(null);
    const [banner2File, setBanner2File] = useState(null);
    const [plusIconUrl, setPlusIconUrl] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        let mounted = true;
        const loadPlusIcon = async () => {
            const iconMap = await getIconMap();
            const iconUrl = getStrictBackendIconUrl(iconMap, 'libplus.svg');

            if (mounted) {
                setPlusIconUrl(iconUrl);
            }
        };
        loadPlusIcon();
        return () => { mounted = false; };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !banner1File || !audioFile || !banner2File) {
            setMessage('Title, audio, banner 1 and banner 2 are required.');
            return;
        }

        setSubmitting(true);
        setMessage('');
        try {
            const adRes = await uploadAd({
                title: title.trim(),
                targetUrl: targetUrl.trim(),
                imageFile: banner1File,
                audioFile,
            });
            const bannerRes = await uploadBanner({
                title: title.trim(),
                link: targetUrl.trim(),
                imageFile: banner2File,
            });

            const adId = pickFirstValue(adRes?.data, ['id', 'adId', 'data.id']);
            const bannerId = pickFirstValue(bannerRes?.data, ['id', 'bannerId', 'data.id']);
            setMessage(`Published successfully. Ad: ${adId || 'ok'}, Banner: ${bannerId || 'ok'}.`);
            setTitle('');
            setTargetUrl('');
            setAudioFile(null);
            setBanner1File(null);
            setBanner2File(null);
        } catch (e) {
            const responseError = e?.response?.data;
            const status = e?.response?.status;
            const details =
                (typeof responseError === 'string' && responseError) ||
                responseError?.message ||
                responseError?.title ||
                e?.message ||
                'Unknown error';
            setMessage(`Upload failed${status ? ` (${status})` : ''}: ${details}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="panel">
            <h3>Ads Publish</h3>
            <form className="ads-form ads-form-clean" onSubmit={handleSubmit}>
                <label className="ads-label">Назва реклами</label>
                <input
                    className="ads-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ad title"
                    required
                />
                <label className="ads-label">URL переходу (optional)</label>
                <input
                    className="ads-input"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="https://example.com"
                />

                <div className="upload-tile-grid">
                    <UploadTile
                        label="Аудіофайл"
                        hint="mp3 / wav / m4a"
                        file={audioFile}
                        accept="audio/*"
                        onPick={setAudioFile}
                        plusIconUrl={plusIconUrl}
                    />
                    <UploadTile
                        label="Баннер 1 (Ads)"
                        hint="jpg / png / webp"
                        file={banner1File}
                        accept="image/*"
                        onPick={setBanner1File}
                        plusIconUrl={plusIconUrl}
                    />
                    <UploadTile
                        label="Баннер 2 (Banners)"
                        hint="jpg / png / webp"
                        file={banner2File}
                        accept="image/*"
                        onPick={setBanner2File}
                        plusIconUrl={plusIconUrl}
                    />
                </div>

                <div className="ads-actions">
                    <button type="submit" className="btn-primary" disabled={submitting}>
                        {submitting ? 'Publishing...' : 'Publish'}
                    </button>
                </div>
            </form>

            {message && <div className="status-card">{message}</div>}
        </div>
    );
}

function AdsLibraryManager() {
    const [ads, setAds] = useState([]);
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [deleteAdId, setDeleteAdId] = useState('');
    const [deleteBannerId, setDeleteBannerId] = useState('');

    const loadData = async () => {
        setLoading(true);
        setMessage('');
        try {
            const [adsData, bannersData] = await Promise.all([getAllAds(), getBanners()]);
            setAds(Array.isArray(adsData) ? adsData : []);
            setBanners(Array.isArray(bannersData) ? bannersData : []);
        } catch (_) {
            setMessage('Failed to load ads/banners.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleDeleteAd = async (id) => {
        if (!id) return;
        if (!confirm('Delete this ad permanently?')) return;
        setDeleteAdId(id);
        setMessage('');
        try {
            await deleteAd(id);
            setMessage('Ad deleted.');
            await loadData();
        } catch (e) {
            const status = e?.response?.status;
            const details = e?.response?.data?.message || e?.response?.data?.title || e?.message || 'Unknown error';
            if (status === 500) {
                try {
                    await disableAd(id);
                    setMessage('Delete returned 500, ad was disabled instead.');
                    await loadData();
                    return;
                } catch (disableErr) {
                    const disableStatus = disableErr?.response?.status;
                    setMessage(`Delete failed (500), disable failed${disableStatus ? ` (${disableStatus})` : ''}.`);
                    return;
                }
            }
            setMessage(`Delete ad failed${status ? ` (${status})` : ''}: ${details}`);
        } finally {
            setDeleteAdId('');
        }
    };

    const handleDeleteBanner = async (id) => {
        if (!id) return;
        if (!confirm('Delete this banner permanently?')) return;
        setDeleteBannerId(id);
        setMessage('');
        try {
            await deleteBanner(id);
            setMessage('Banner deleted.');
            await loadData();
        } catch (e) {
            const status = e?.response?.status;
            setMessage(`Delete banner failed${status ? ` (${status})` : ''}.`);
        } finally {
            setDeleteBannerId('');
        }
    };

    return (
        <div className="panel">
            <div className="ads-list-head">
                <h3>Ads Library</h3>
                <button type="button" className="btn-soft" onClick={loadData} disabled={loading}>
                    {loading ? 'Loading...' : 'Refresh'}
                </button>
            </div>
            {message && <div className="status-card">{message}</div>}

            <h4>All Ads</h4>

            {ads.length === 0 ? (
                <div className="status-card">{loading ? 'Loading ads...' : 'No ads yet.'}</div>
            ) : (
                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                        <tr>
                            <th>ID</th>
                            <th>Title</th>
                            <th>Status</th>
                            <th>Target URL</th>
                            <th>Media</th>
                            <th>Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {ads.map((ad) => {
                            const adId = String(pickFirstValue(ad, ['id', 'adId']) || '');
                            const title = pickFirstString(ad, ['title']) || '-';
                            const isActive = pickFirstValue(ad, ['isActive']) === true;
                            const targetUrl = pickFirstString(ad, ['targetUrl']);
                            const imageUrl = getAdImageCandidates(adId)[0];
                            const audioUrl = getAdAudioUrl(adId);
                            return (
                                <tr key={adId || title}>
                                    <td>{adId || '-'}</td>
                                    <td>{title}</td>
                                    <td>{isActive ? 'Active' : 'Disabled'}</td>
                                    <td>{targetUrl || '-'}</td>
                                    <td>
                                        {adId ? (
                                            <div className="inline-links">
                                                <a href={imageUrl} target="_blank" rel="noreferrer">image</a>
                                                <a href={audioUrl} target="_blank" rel="noreferrer">audio</a>
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td>
                                        <button
                                            type="button"
                                            className="btn-danger"
                                            onClick={() => handleDeleteAd(adId)}
                                            disabled={!adId || deleteAdId === adId}
                                        >
                                            {deleteAdId === adId ? 'Deleting...' : 'Delete'}
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            )}

            <h4 className="subsection-title">All Banners</h4>
            {banners.length === 0 ? (
                <div className="status-card">{loading ? 'Loading banners...' : 'No banners yet.'}</div>
            ) : (
                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                        <tr>
                            <th>ID</th>
                            <th>Title</th>
                            <th>Link</th>
                            <th>Image</th>
                            <th>Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {banners.map((banner) => {
                            const bannerId = String(pickFirstValue(banner, ['id', 'bannerId']) || '');
                            const title = pickFirstString(banner, ['title']) || '-';
                            const link = pickFirstString(banner, ['link', 'targetUrl']);
                            const imageUrl = bannerId ? resolveAssetUrl(`/api/banners/image/${bannerId}`) : '';
                            return (
                                <tr key={bannerId || title}>
                                    <td>{bannerId || '-'}</td>
                                    <td>{title}</td>
                                    <td>{link || '-'}</td>
                                    <td>
                                        {imageUrl ? <a href={imageUrl} target="_blank" rel="noreferrer">image</a> : '-'}
                                    </td>
                                    <td>
                                        <button
                                            type="button"
                                            className="btn-danger"
                                            onClick={() => handleDeleteBanner(bannerId)}
                                            disabled={!bannerId || deleteBannerId === bannerId}
                                        >
                                            {deleteBannerId === bannerId ? 'Deleting...' : 'Delete'}
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

/* === MAIN APP === */
function App() {
    const [token, setToken] = useState(localStorage.getItem('adminToken'));
    const [tab, setTab] = useState('tracks');
    const [logoUrl, setLogoUrl] = useState('');

    useEffect(() => {
        if (!token) {
            setLogoUrl('');
            return;
        }

        let mounted = true;

        const loadLogo = async () => {
            const iconMap = await getIconMap();
            const strictLogoUrl = getStrictBackendIconUrl(iconMap, 'VOX2.svg');
            if (mounted) setLogoUrl(strictLogoUrl);
        };

        loadLogo();
        return () => { mounted = false; };
    }, [token]);

    if (!token) {
        return <Login onLogin={() => setToken(localStorage.getItem('adminToken'))} />;
    }

    return (
        <div className="app-layout">
            <div className="sidebar">
                <div className="brand-block">
                    <div className="logo-slot">
                        {logoUrl ? (
                            <img src={logoUrl} alt="VOX" className="logo-image" onError={() => setLogoUrl('')} />
                        ) : (
                            <div className="logo-placeholder" aria-hidden="true" />
                        )}
                    </div>
                    <p className="brand-subtitle">Music Admin</p>
                </div>
                <nav>
                    <button className={tab === 'tracks' ? 'active' : ''} onClick={() => setTab('tracks')}>Pending Tracks</button>
                    <button className={tab === 'authors' ? 'active' : ''} onClick={() => setTab('authors')}>Artist Requests</button>
                    <button className={tab === 'genres' ? 'active' : ''} onClick={() => setTab('genres')}>Genres</button>
                    <button className={tab === 'adsPublish' ? 'active' : ''} onClick={() => setTab('adsPublish')}>Ads Publish</button>
                    <button className={tab === 'adsLibrary' ? 'active' : ''} onClick={() => setTab('adsLibrary')}>Ads Library</button>
                </nav>
                <button className="logout-btn btn-danger" onClick={() => { localStorage.clear(); setToken(null); }}>Logout</button>
            </div>

            <div className="content">
                {tab === 'tracks' && <TracksManager />}
                {tab === 'authors' && <AuthorsManager />}
                {tab === 'genres' && <GenreManager />}
                {tab === 'adsPublish' && <AdsPublishManager />}
                {tab === 'adsLibrary' && <AdsLibraryManager />}
            </div>
        </div>
    );
}

export default App;
