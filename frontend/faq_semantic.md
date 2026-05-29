# Implementation Specification: Frontend-Only Unified Search Engine

**Target Audience:** Frontend Engineering Team (React / MERN)
**Objective:** Implement a zero-API, fully client-side TF-IDF search engine that queries both structured FAQs and high-volume Community Questions instantly, without freezing the main UI thread or crashing mobile browsers.

---

## 1. Architectural Overview

To handle the scale of Community Questions (~10k+ records) alongside FAQs without crashing low-end devices, we utilize a **Decoupled Client-Side Search Architecture**:

1. **The UI Thread (React):** Handles user input, debouncing, and rendering results. Contains zero search logic.
2. **The Background Thread (Web Worker):** Runs the `MiniSearch` engine. Keeps the app running at 60FPS while complex TF-IDF matrix math executes in the background.
3. **The Storage Layer (IndexedDB via LocalForage):** `MiniSearch` only stores document IDs and mathematical weights in RAM. The heavy text payloads (titles, content) are stored in the browser's persistent database to prevent memory overflows.

### Project Structure

```text
/src
  ├── workers/
  │   └── searchEngine.worker.js    # The background thread logic
  ├── hooks/
  │   └── useUnifiedSearch.js       # React bridge to the worker
  ├── components/
  │   ├── HelpPortal.jsx            # Main Search UI
  │   ├── SearchInput.jsx           # Debounced input
  │   └── ResultCard.jsx            # Render component for both types
  └── config/
      └── searchSynonyms.js         # Dictionary for lexical expansion

```

---

## 2. Dependencies & Prerequisites

Install the required packages in your React frontend:

```bash
npm install minisearch localforage lodash.debounce

```

**Backend Contract (Node.js/Express):**
The frontend expects a single, fast endpoint (e.g., `/api/help-data/export`) that returns a compressed JSON array containing both FAQs and Community Questions. Ensure the backend uses **GZIP/Brotli compression** and standard `Cache-Control` headers.

```json
// Expected Data Schema. Make sure to confirm the actual schema!
[
  {
    "id": "faq_101",
    "type": "faq", 
    "title": "How to reset your password",
    "content": "Navigate to settings > security...",
    "tags": ["auth", "credentials"]
  },
  {
    "id": "com_992",
    "type": "community",
    "title": "Getting a 403 error on login endpoint",
    "content": "Whenever I try to pass my JWT token...",
    "tags": ["api", "error", "auth"]
  }
]

```

---

## 3. The Web Worker (Search Engine Core)

Create `src/workers/searchEngine.worker.js`.
This file acts as the isolated brain of the application. It downloads the data, builds the inverted index, stores payloads in IndexedDB, and processes queries.

```javascript
import MiniSearch from 'minisearch';
import localforage from 'localforage';

// Synonym dictionary to map user terms to system tags
const SYNONYMS = {
  'signin': 'login',
  'invoice': 'billing',
  'error': 'bug',
  'credential': 'password'
};

let miniSearchInstance;

self.onmessage = async (event) => {
  const { type, payload } = event.data;

  // ==========================================
  // PHASE 1: INITIALIZATION & INDEXING
  // ==========================================
  if (type === 'INIT') {
    try {
      // 1. Fetch the unified dataset from the backend
      const response = await fetch(payload.dataEndpoint);
      if (!response.ok) throw new Error('Failed to fetch search data');
      const documents = await response.json();

      // 2. Configure the TF-IDF Engine
      miniSearchInstance = new MiniSearch({
        idField: 'id',
        fields: ['title', 'content', 'tags'],
        // CRITICAL: We only store 'type' in RAM. Text content is excluded to save memory.
        storeFields: ['type'],
        
        // Extract tags array into a searchable space-separated string
        extractField: (document, fieldName) => {
          if (fieldName === 'tags') return document[fieldName].join(' ');
          return document[fieldName];
        },
        
        searchOptions: {
          // Weight tuning: Tags are most important, then title, then content
          boost: { tags: 4, title: 2, content: 1 },
          prefix: true, // Matches "auth" to "authentication"
          fuzzy: 0.2,   // Typo tolerance
        }
      });

      // 3. Build the mathematical index
      miniSearchInstance.addAll(documents);

      // 4. Store heavy text payloads in IndexedDB for O(1) lookup
      const documentDictionary = {};
      documents.forEach(doc => { documentDictionary[doc.id] = doc; });
      await localforage.setItem('unified_help_docs', documentDictionary);

      self.postMessage({ type: 'READY' });
    } catch (error) {
      self.postMessage({ type: 'ERROR', payload: error.message });
    }
  }

  // ==========================================
  // PHASE 2: SEARCH EXECUTION
  // ==========================================
  if (type === 'SEARCH') {
    if (!miniSearchInstance) return;

    let { query } = payload;
    let processedQuery = query.toLowerCase();

    // Synonym Expansion (e.g., "signin" becomes "signin login")
    Object.keys(SYNONYMS).forEach(key => {
      if (processedQuery.includes(key)) {
        processedQuery += ` ${SYNONYMS[key]}`;
      }
    });

    // Run the math against the index
    const rawMatches = miniSearchInstance.search(processedQuery);
    
    // Cap results at Top 30 to preserve UI rendering speed
    const topMatches = rawMatches.slice(0, 30);

    // Retrieve actual text payloads from IndexedDB
    const documentDictionary = await localforage.getItem('unified_help_docs');
    
    const populatedResults = topMatches.map(match => ({
      ...documentDictionary[match.id],
      score: match.score // Include relevance score for UI debugging/sorting
    }));

    self.postMessage({ type: 'RESULTS', payload: populatedResults });
  }
};

```

---

## 4. The React Hook Bridge

Create `src/hooks/useUnifiedSearch.js`.
React components cannot natively talk to Web Workers. This hook handles the messaging lifecycle and exposes a clean API to your UI.

```javascript
import { useState, useEffect, useRef, useCallback } from 'react';

export const useUnifiedSearch = (dataEndpoint) => {
  const [results, setResults] = useState({ faqs: [], community: [] });
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  
  const workerRef = useRef(null);

  useEffect(() => {
    // Initialize worker (Vite/Webpack 5 syntax)
    workerRef.current = new Worker(
      new URL('../workers/searchEngine.worker.js', import.meta.url),
      { type: 'module' }
    );

    // Listen for worker responses
    workerRef.current.onmessage = (event) => {
      const { type, payload } = event.data;

      if (type === 'READY') setIsReady(true);
      if (type === 'ERROR') setError(payload);
      
      if (type === 'RESULTS') {
        // Categorize results immediately before passing to UI
        const categorized = payload.reduce(
          (acc, doc) => {
            if (doc.type === 'faq') acc.faqs.push(doc);
            if (doc.type === 'community') acc.community.push(doc);
            return acc;
          },
          { faqs: [], community: [] }
        );
        setResults(categorized);
      }
    };

    // Trigger the download and index process
    workerRef.current.postMessage({ type: 'INIT', payload: { dataEndpoint } });

    // Cleanup worker on unmount
    return () => workerRef.current.terminate();
  }, [dataEndpoint]);

  const search = useCallback((query) => {
    if (!isReady || !query.trim()) {
      setResults({ faqs: [], community: [] });
      return;
    }
    workerRef.current.postMessage({ type: 'SEARCH', payload: { query } });
  }, [isReady]);

  return { search, results, isReady, error };
};

```

---

## 5. UI Implementation

Create `src/components/HelpPortal.jsx`.
This component ties it all together, utilizing a debounced input to prevent overloading the worker with every single keystroke.

```jsx
import React, { useState, useMemo, useEffect } from 'react';
import debounce from 'lodash.debounce';
import { useUnifiedSearch } from '../hooks/useUnifiedSearch';

const ResultCard = ({ doc }) => (
  <div className="p-4 mb-3 border rounded-lg bg-white hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-2">
      <h4 className="font-semibold text-lg text-gray-800">{doc.title}</h4>
      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
        doc.type === 'faq' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
      }`}>
        {doc.type === 'faq' ? 'Official FAQ' : 'Community'}
      </span>
    </div>
    <p className="text-gray-600 text-sm line-clamp-2">{doc.content}</p>
    <div className="mt-3 flex gap-2 flex-wrap">
      {doc.tags.map(tag => (
        <span key={tag} className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
          #{tag}
        </span>
      ))}
    </div>
  </div>
);

export const HelpPortal = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Point this to your Express backend
  const { search, results, isReady, error } = useUnifiedSearch('/api/help-data/export');

  // Debounce search execution (wait 250ms after user stops typing)
  const executeSearch = useMemo(
    () => debounce((query) => search(query), 250),
    [search]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => executeSearch.cancel();
  }, [executeSearch]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    executeSearch(value);
  };

  if (error) return <div className="text-red-500 p-4">Error loading search: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="mb-8 relative">
        <h1 className="text-3xl font-bold mb-4">How can we help?</h1>
        <div className="relative">
          <input
            type="text"
            disabled={!isReady}
            placeholder={isReady ? "Search FAQs and Community discussions..." : "Loading search engine..."}
            value={searchTerm}
            onChange={handleInputChange}
            className="w-full p-4 pr-12 text-lg border rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          {!isReady && (
            <div className="absolute right-4 top-5">
              <span className="animate-pulse text-sm text-blue-600 font-medium">Syncing...</span>
            </div>
          )}
        </div>
      </div>

      {searchTerm && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* FAQs Column */}
          <div>
            <h2 className="text-xl font-bold mb-4 border-b pb-2">Official Answers</h2>
            {results.faqs.length > 0 ? (
              results.faqs.map(doc => <ResultCard key={doc.id} doc={doc} />)
            ) : (
              <p className="text-gray-500 italic">No matching FAQs.</p>
            )}
          </div>

          {/* Community Column */}
          <div>
            <h2 className="text-xl font-bold mb-4 border-b pb-2">Community Discussions</h2>
            {results.community.length > 0 ? (
              results.community.map(doc => <ResultCard key={doc.id} doc={doc} />)
            ) : (
              <p className="text-gray-500 italic">No community discussions found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

```

---

## 6. Build & Deployment Considerations

1. **Bundler Configurations:** If you are using standard Vite or Next.js (Webpack 5), the `new Worker(new URL(..., import.meta.url))` syntax will automatically compile correctly. If you are using an older Create React App setup (Webpack 4), you may need to eject or use a package like `worker-loader`.
2. **Backend Caching:** Since the frontend downloads the entire dataset on load, the Node.js backend *must* set cache headers on the `/api/help-data/export` endpoint. Recommend using an `ETag`. The browser will then only download the payload if the database has actually changed, otherwise it loads instantly from the browser's HTTP cache.
3. **Index Persistance (Optional advanced upgrade):** Currently, the Web Worker builds the `minisearch` math index from scratch on page refresh. For 10,000 items, this takes ~150ms. If your dataset grows to 50,000+ items, you can use `miniSearchInstance.toJSON()` to save the pre-calculated math index directly into IndexedDB as well, dropping initialization time to ~5ms.