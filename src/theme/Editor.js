import React, { useEffect, useState } from 'react'

import clsx from 'clsx'
import Head from '@docusaurus/Head'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import useBaseUrl from '@docusaurus/useBaseUrl'

import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Octokit } from '@octokit/core'
import  { restEndpointMethods } from '@octokit/plugin-rest-endpoint-methods'

import unified from 'unified'
import markdown from 'remark-parse'
import frontmatter from 'remark-frontmatter'
import remark2rehype from 'remark-rehype'
import stringify from 'rehype-stringify'

import EditorMenu from '@theme/EditorMenu'
import EditorPage from '@theme/EditorPage'
import EditorLogin from '@theme/EditorLogin'

export default function Editor({ options, className }) {
  const {
    siteConfig: {
      organizationName,
      projectName,
    }
  } = useDocusaurusContext()

  const {
    docsPath,
    github: {
      clientId,
      tokenUri,
    }
  } = options

  const [github, setGithub] = useState()

  const editBaseUrl = useBaseUrl('/edit')

  const editor = useEditor({
    extensions: [
      StarterKit,
    ],
    autofocus: 'start',
  })

  const getCode = () => {
    const codeUri = new URL('https://github.com/login/oauth/authorize')
    const redirectUri = window.location.origin + window.location.pathname

    const parameters = codeUri.searchParams
    parameters.append('client_id', clientId)
    parameters.append('redirect_uri', redirectUri)

    window.location.replace(codeUri.href)
  }

  const getToken = (code) => {
    const redirectUri = window.location.origin + window.location.pathname

    fetch(tokenUri + code)
      .then(response => response.json())
      .then(data => sessionStorage.setItem('token', data.token))
      .then(() => window.location.replace(redirectUri))
  }

  useEffect(() => {
    if (github) {
      const filePath = window.location.pathname.slice(editBaseUrl.length)
      const contentPath = docsPath + filePath + '.md'
      console.log(contentPath)

      if (filePath) {
        github.repos.getContent({
          owner: organizationName,
          repo: projectName,
          path: contentPath,
        })
        .then(data => {
          const {
            data: {
              sha,
              download_url
            }
          } = data

          fetch(download_url)
            .then(response => response.text())
            .then((text) => {
              unified()
                .use(markdown)
                .use(frontmatter, ['yaml'])
                .use(remark2rehype)
                .use(stringify)
                .process(text, function (err, file) {
                  if (err) throw err
                  editor.chain().setContent(String(file)).focus('start').run()
                })
            })
        })
      }
    }
  }, [github])

  useEffect(() => {
    const token = sessionStorage.getItem('token')
    if (token) {
      const OctokitRest = Octokit.plugin(restEndpointMethods);
      const octokitRest = new OctokitRest({ auth: token });
      setGithub(octokitRest.rest)
    } else {
      const parameters = new URLSearchParams(window.location.search)
      if (parameters.has('code')) {
        getToken(parameters.get('code'))
      } else {
        getCode()
      }
    }
  }, [])

  return (
    <>
      <Head>
        <link href='https://fonts.googleapis.com/icon?family=Material+Icons' rel='stylesheet'></link>
      </Head>
      {github ?
        <div className={clsx('editor', className)}>
          <EditorMenu editor={editor} />
          <EditorPage editor={editor} />
        </div>
      :
        <EditorLogin />
      }
    </>
  )
}