// Human-readable subject; reply threading is carried by MIME headers separately.
export function quoteSubject(quote) {
  const clean = value => String(value ?? '').replace(/[\r\n\t\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  const shorten = (value, limit) => value.length > limit ? value.slice(0, limit - 1) + '…' : value;
  const company = shorten(clean(quote.company?.company) || '견적 안내', 30);
  const names = [...new Set((quote.items || []).map(item => clean(item.name)).filter(Boolean))];
  const products = names.length ? shorten(names[0], 55) + (names.length > 1 ? ` 외 ${names.length - 1}종` : '') : '요청하신 제품';
  const number = shorten(clean(quote.number), 45);
  return `[${company}] ${products} 견적서 보내드립니다${number ? ` (${number})` : ''}`;
}
