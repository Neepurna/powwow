import React, { useState, useEffect } from 'react';
import '../styles/Share.css'; // Create this CSS file

interface ShareProps {
  url: string;
  title?: string;
  text?: string;
  onClose: () => void;
}

const Share: React.FC<ShareProps> = ({ url, title = 'Join me on Powwow!', text = 'Check out Powwow and join the conversation!', onClose }) => {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    // Check if Web Share API is supported
    if (navigator.share) {
      setCanShare(true);
    }
  }, []);

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: text,
          url: url,
        });
        console.log('Content shared successfully');
        onClose(); // Close modal after successful share
      } catch (error) {
        console.error('Error sharing:', error);
        // Don't close if sharing fails, user might want to copy instead
      }
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        onClose(); // Close after showing copied message
      }, 1500); // Hide message after 1.5 seconds
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      // Optionally show an error message to the user
    });
  };

  return (
    <div className="share-overlay" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Share Powwow</h3>
        <p className="share-link-display">{url}</p>

        <div className="share-actions">
          {canShare && (
            <button onClick={handleNativeShare} className="share-button native-share">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
              Share via...
            </button>
          )}
          <button onClick={handleCopyToClipboard} className={`share-button copy-link ${copied ? 'copied' : ''}`}>
            {copied ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                Copied!
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                Copy Link
              </>
            )}
          </button>
        </div>
        <button onClick={onClose} className="share-close-button">Cancel</button>
      </div>
    </div>
  );
};

export default Share;
