function makeBookmarksArray() {
  return [
    {
      id: 1,
      title: 'Google',
      url: 'www.google.com',
      description: 'Search engine for all',
      rating: '4'
    },
    {
      id: 2,
      title: 'Amazon',
      url: 'www.amazon.com',
      description: 'Beat of the internet',
      rating: '2'
    },
    {
      id: 3,
      title: 'Github',
      url: 'www.github.com',
      description: 'Necessary for devs',
      rating: '5'
    }
  ]
}

function makeMaliciousBookmark() {
  const maliciousBookmark = {
    id: 911,
    rating: '2',
    url: 'ww.fake-place-does-not-exist.website',
    title: 'Malicious <script>alert("xss");</script>',
    description: 'Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">.',
  }
  const expectedArticle = {
    ...maliciousBookmark,
    title: 'Malicious &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
    description: 'Bad image <img src="https://url.to.file.which/does-not.exist">'
  }
  return {
    maliciousBookmark,
    expectedArticle
  }
}

module.exports = {
  makeBookmarksArray,
  makeMaliciousBookmark
}