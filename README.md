<p align="center">
<img src="https://devforum.okta.com/uploads/oktadev/original/1X/0c6402653dfb70edc661d4976a43a46f33e5e919.png" href='https://devforum.okta.com/' width="350px"/>
</p>

# Okta developer blog [![Build Status](https://travis-ci.org/oktadeveloper/okta-blog.svg?branch=source)](https://travis-ci.org/oktadeveloper/okta-blog)

The Okta developer blog ([developer.okta.com/blog](https://developer.okta.com/blog)) is built using [Hugo](https://gohugo.io/).

See a problem or want to contribute? Read [Contributing to the site](#contributing-to-the-site) below.

## Getting help

If you have questions or need help with Okta's APIs or SDKs, visit our [Developer Forums](https://devforum.okta.com/) or ask a question on [Stack Overflow](https://stackoverflow.com/questions/tagged/okta). You can also email developers@okta.com to create a support ticket.

### Helpful resources and links

- [API Reference](https://developer.okta.com/docs/api/resources/)
- [SDK Reference and Sample Code](https://developer.okta.com/documentation/)
- [Authentication Quickstarts](https://developer.okta.com/quickstart/)

## Contributing to the site

Documentation updates, bug fixes, and PRs are all welcome!

To begin, you'll need to clone this project locally and install its dependencies.

**NOTE:** If you're not a member of the `oktadeveloper` org, you'll need to fork this repo and adjust the GitHub URL accordingly.

```
git clone git@github.com:oktadeveloper/okta-blog.git
cd okta-blog
npm i
gem install bundler
bundle install
```

Then you can build the site with `npm start`. Visit [`localhost:1313`](http://localhost:1313) in your browser. 

### Create a new blog post

To create a new blog post, start by creating a new branch.

```
git checkout -b <branch name>
```

Then create a new Markdown (`*.md`) or AsciiDoc (`*.adoc`) file in `content/blog`. The name of the file will be the URL, so make sure you talk to Lindsay (or your Okta contact) to confirm you have the right keywords in it.

The file you create should have [front matter](https://gohugo.io/content-management/front-matter) at the top that defines metadata for the post. The date it's published on is controlled by the `date` line. For example:

```
---
layout: blog_post
title: 'Why JWTs Suck as Session Tokens'
author: rdegges
date: 2017-08-17T00:00:00Z
description: "Learn why you should never use JSON web tokens as session tokens (either in cookies or HTML local storage)."
tags: [security, jwt, token, authentication, sessions]
tweets:
    - "@rdegges doesn't like JSON Web Tokens. Do you?"
    - "Stop using JSON Web Tokens for web authentication. Use cookies and session IDs instead."
---
```

**TIP:** Make sure you add a period to the description as this will show up as a sentence when it shows up as a search result in Google.

For images in your post, you should use a regular `<img>` tag and control its width with the `width` attribute. Use the `center-image` style to center the image.

```html
<img src="/img/browser_spa_implicit_flow" alt="Browser Implicit Flow" width="600" class="center-image">
```

Images for your post should go in a directory under `themes/okta/static/img/blog`. Create a new directory for your post and put your images in there. Name the directory to match your post's keywords, or simply match the URL. 

Images should be sized so they're not too big. We recommend a max image size of 1600px, so it looks good on retina displays. They should be optimized as well. For macOS, we recommend [ImageOptim](https://imageoptim.com/mac).

**NOTE:** In the future, we hope to use `<img srcset>` to create [responsive images](https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images) for different screen sizes.

Once you're satisfied with your post, push it to this repo and create a pull request.

```
git add .
git commit -m "Add Your Awesome Post"
git push origin <branch name>
```

Notify the team in Slack that you're ready for your PR to be reviewed.

**NOTE:** Until Hugo is live PRs should not be merged. Instead, the Markdown and images should be copied to [@okta/okta.github.io](https://github.com/okta/okta.github.io). This will be handled by someone that works for Okta.
