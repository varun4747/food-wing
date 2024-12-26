
url = 'https://newsapi.org/v2/everything?q=food%20shortage&apiKey=3cca539a87d64453962ed8f303772608'
fetch(url)
    .then(res => res.json())
    .then(data => {
        console.log(data);
});
