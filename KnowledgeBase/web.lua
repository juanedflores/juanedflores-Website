--[[ Pandoc filter: turns my guide markdown (written for the LaTeX/PDF
     export in Creative_Coding_Guides) into web-friendly HTML.

     - \commandline{...} boxes become terminal-style lines
     - other raw LaTeX (\begin{center}, \pagebreak, ...) is dropped
     - inline color spans map to the site's palette so they read in
       night and day mode
     - Obsidian image sizes ("|400" in the alt text) are removed, and
       height=/width= become CSS sizes
     - the first # heading becomes the page title
]]

local function escape_html(s)
  return (s:gsub('&', '&amp;'):gsub('<', '&lt;'):gsub('>', '&gt;'))
end

-- \textbf{..} and \textcolor{c}{..}, innermost first
local function latex_inline_to_html(s)
  s = s:gsub('\\%$', '$'):gsub('\\_', '_'):gsub('\\#', '#'):gsub('\\&', '&')
  s = escape_html(s)
  local n
  repeat
    s, n = s:gsub('\\textcolor{([%w%-]+)}{([^{}]*)}', '<span class="tc-%1">%2</span>')
    local m
    s, m = s:gsub('\\textbf{([^{}]*)}', '<b>%1</b>')
    n = n + m
  until n == 0
  return s
end

local function commandlines(text)
  local out = {}
  for line in text:gmatch('[^\n]+') do
    local arg = line:match('^%s*\\commandline(%b{})%s*$')
    if arg then
      table.insert(out, '<div class="cmdline">' .. latex_inline_to_html(arg:sub(2, -2)) .. '</div>')
    end
  end
  return out
end

function RawBlock(el)
  if el.format ~= 'latex' and el.format ~= 'tex' then
    return nil
  end
  local html = commandlines(el.text)
  if #html > 0 then
    return pandoc.RawBlock('html', table.concat(html, '\n'))
  end
  return {}
end

function RawInline(el)
  if el.format ~= 'latex' and el.format ~= 'tex' then
    return nil
  end
  local html = commandlines(el.text)
  if #html > 0 then
    return pandoc.RawInline('html', table.concat(html, ''))
  end
  return {}
end

-- named colors from the PDF, mapped to the site's palette
local COLOR_CLASSES = {
  blue = 'tc-accent',
  teal = 'tc-accent',
  lightgray = 'tc-muted',
  gray = 'tc-muted',
  grey = 'tc-muted',
}

function Span(el)
  local style = el.attributes.style
  if not style then
    return nil
  end
  local color = style:match('color:%s*([^;]+)')
  if not color then
    return nil
  end
  color = color:lower():gsub('%s', '')
  if COLOR_CLASSES[color] then
    el.attributes.style = nil
    el.classes:insert(COLOR_CLASSES[color])
  elseif color == '#ff77a8' then
    -- PICO-8 pink
    el.attributes.style = nil
    el.classes:insert('tc-pico-pink')
  elseif color == 'red' then
    el.attributes.style = nil
    el.classes:insert('tc-pico-red')
  end
  return el
end

function Image(el)
  -- "|400" or "A caption|300": Obsidian's display size, not alt text
  local alt = pandoc.utils.stringify(el.caption)
  if alt:find('|') then
    alt = alt:match('^(.-)|') or ''
    if alt == 'A caption' then
      alt = ''
    end
    el.caption = alt ~= '' and { pandoc.Str(alt) } or {}
  end

  local styles = {}
  local h = el.attributes.height
  if h then
    table.insert(styles, 'height:' .. (h:match('^%d+$') and h .. 'px' or h) .. ';width:auto')
    el.attributes.height = nil
  end
  local w = el.attributes.width
  if w then
    table.insert(styles, 'width:' .. (w:match('^%d+$') and w .. 'px' or w))
    el.attributes.width = nil
  end
  el.attributes.skipabove = nil
  if #styles > 0 then
    el.attributes.style = table.concat(styles, ';')
  end
  return el
end

function Pandoc(doc)
  local first = doc.blocks[1]
  if first and first.t == 'Header' and first.level == 1 then
    doc.meta.title = pandoc.MetaInlines(first.content)
    doc.blocks:remove(1)
  end
  return doc
end
