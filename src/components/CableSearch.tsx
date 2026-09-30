import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cableNames } from '@/lib/cable-names';
import { buildCableSearchIndex, normalizeCableSearch, searchCables } from '@/lib/cable-search';
import { cablesQueryOptions } from '@/lib/cables';
import { cn } from '@/lib/utils';

interface CableSearchProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (id: string, name: string) => void;
  onPreview: (id: string | null) => void;
}

export default function CableSearch({ query, onQueryChange, onSelect, onPreview }: CableSearchProps) {
  const { t, i18n } = useTranslation();
  const { data: cables, isLoading, isError } = useQuery(cablesQueryOptions);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const index = useMemo(() => buildCableSearchIndex(cables ?? [], cableNames, (code) => [
    i18n.getFixedT('en')(`cablePopup.countryNames.${code}`, { defaultValue: code }),
    i18n.getFixedT('zh-TW')(`cablePopup.countryNames.${code}`, { defaultValue: code }),
  ]), [cables, i18n]);
  const results = useMemo(() => searchCables(index, query), [index, query]);
  const showResults = open && Boolean(normalizeCableSearch(query));
  const activeResult = showResults ? results[activeIndex] : undefined;

  useEffect(() => {
    onPreview(activeResult?.id ?? null);
  }, [activeResult?.id, onPreview]);

  useEffect(() => {
    if (activeIndex >= 0 && showResults) {
      listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, showResults]);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  const choose = (id: string, name: string) => {
    onPreview(null);
    setActiveIndex(-1);
    setOpen(false);
    onSelect(id, name);
  };

  return (
    <div
      ref={rootRef}
      className="relative w-[220px]"
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          setActiveIndex(-1);
        }
      }}
    >
      <div className="flex h-10 items-center gap-2 rounded-full border border-white/20 bg-black/25 px-3 text-white shadow-lg backdrop-blur-md focus-within:border-white/50">
        <Search aria-hidden="true" className="size-4 shrink-0 text-white/60" />
        <input
          ref={inputRef}
          role="combobox"
          aria-label={t('cableSearch.label')}
          aria-autocomplete="list"
          aria-expanded={showResults}
          aria-controls={showResults ? listId : undefined}
          aria-activedescendant={activeResult ? `${listId}-${activeResult.id}` : undefined}
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/50"
          placeholder={t('cableSearch.placeholder')}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setActiveIndex(-1);
            setOpen(true);
            onPreview(null);
            onQueryChange(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              setOpen(true);
              if (results.length) {
                const delta = event.key === 'ArrowDown' ? 1 : -1;
                setActiveIndex((current) => current < 0
                  ? event.key === 'ArrowDown' ? 0 : results.length - 1
                  : (current + delta + results.length) % results.length);
              }
            }
            else if (event.key === 'Enter' && activeResult) {
              event.preventDefault();
              choose(activeResult.id, activeResult.name);
            }
            else if (event.key === 'Escape') {
              event.preventDefault();
              setOpen(false);
              setActiveIndex(-1);
            }
          }}
        />
        {query && (
          <button
            type="button"
            aria-label={t('cableSearch.clear')}
            className="shrink-0 rounded-full p-0.5 text-white/60 hover:text-white focus-visible:outline-2"
            onClick={() => {
              onPreview(null);
              onQueryChange('');
              setActiveIndex(-1);
              setOpen(false);
              inputRef.current?.focus();
            }}
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        )}
      </div>
      {showResults && (
        <div className="absolute top-full left-0 z-30 mt-2 w-80 max-w-[calc(100vw-5rem)] overflow-hidden rounded-xl border border-white/20 bg-slate-950/90 text-sm text-white shadow-xl backdrop-blur-xl">
          <div role="status" className="border-b border-white/10 px-3 py-2 text-xs text-white/60">
            {isLoading ? t('cableSearch.loading') : isError ? t('cableSearch.error') : t('cableSearch.count', { count: results.length })}
          </div>
          <ul
            id={listId}
            ref={listRef}
            role="listbox"
            aria-label={t('cableSearch.results')}
            className="max-h-[min(24rem,calc(100svh-12rem))] overflow-y-auto overscroll-contain"
            onMouseLeave={() => setActiveIndex(-1)}
          >
            {!isLoading && !isError && results.map((result, resultIndex) => (
              <li
                key={result.id}
                id={`${listId}-${result.id}`}
                role="option"
                aria-selected={activeIndex === resultIndex}
                className={cn('flex h-16 cursor-pointer flex-col justify-center gap-1 px-3', activeIndex === resultIndex && 'bg-white/15')}
                onMouseEnter={() => setActiveIndex(resultIndex)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(result.id, result.name)}
              >
                <span className="flex items-baseline gap-2">
                  <span className="shrink-0 font-medium">{result.name}</span>
                  <span className="truncate text-xs text-white/70">{result.chineseName}</span>
                </span>
                <span className="truncate text-xs text-white/60">
                  {result.match.kind === 'name'
                    ? result.englishName || result.chineseName || result.id
                    : t(`cableSearch.match.${result.match.kind}`, { value: result.match.value })}
                </span>
              </li>
            ))}
          </ul>
          {!isLoading && !isError && results.length === 0 && (
            <p className="px-3 py-4 text-white/70">{t('cableSearch.noResults')}</p>
          )}
        </div>
      )}
    </div>
  );
}
