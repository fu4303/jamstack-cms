import React from "react"
import { Storage, API, graphqlOperation } from "aws-amplify"
import styledAuthenticator from '../components/styledAuthenticator'
import NewPost from '../components/NewPost'
import { listPosts } from '../graphql/queries'
import { deletePost, updatePost } from '../graphql/mutations'
import { css } from "@emotion/core"
import TitleComponent from '../components/titleComponent'
import PostList from '../components/PostList'
import MediaView from '../components/MediaView'
import { highlight, fontFamily } from '../theme'
import getImageKey from '../utils/getImageKey'
import { toast } from 'react-toastify'
import JakobsLoader from '../components/jakobsLoader'

class Admin extends React.Component {
  state = {
    isLoading: true,
    viewState: 'list',
    posts: [],
    images: [],
    imageKeys: [],
    imagesInUse: [],
    imagesNotInUse: []
  }
  async componentDidMount() {    
    this.fetchPosts()
    try {
      const media = await Storage.list('')
      const images = media.map(k => Storage.get(k.key))
      const signedImages = await Promise.all(images)
      this.setState({ images: signedImages }, () => {
        this.setImagesInUse()
      })
    } catch(err) {
      console.log('error:' , err)
    }
  }
  fetchPosts = async () => {
    try {
      const postData = await API.graphql(graphqlOperation(listPosts))
      const { items } = postData.data.listPosts
      this.setState({ posts: items, isLoading: false })
    } catch (err) {
      console.log('error fetching posts:', err)
    }
  }
  removeImage = (image) => {
    const images = [...this.state.images.filter(i => i !== image)]
    this.setState({ images }, () => {
      this.setImagesInUse()
    })
  }
  setImagesInUse = () => {
    let imageKeys = this.props.data.allImageKeys.edges.map(k => k.node.data).flat()
    const signedImages = this.state.images
    const imagesInUse = []
    const imagesNotInUse = []
    signedImages.forEach(image => {
      const key = getImageKey(image)
      const keyWithPath = `images/${key}`
      imageKeys.forEach(k => {
        if (k === keyWithPath) {
          imagesInUse.push(image)
        }
      })
    })
    signedImages.forEach(image => {
      if (!imagesInUse.includes(image)) {
        imagesNotInUse.push(image)
      }
    })
    this.setState({ imagesInUse, imagesNotInUse: [...new Set(imagesNotInUse)] })
  }
  addImageToState = images => {
    this.setState({ images }, () => {
      this.setImagesInUse()
    })
  }
  toggleViewState = viewState => this.setState({ viewState })
  deletePost = async ({ id }) => {
    const shouldDelete = window.confirm("Are you sure you'd like to delete this post?");
    if (shouldDelete) {
      const posts = [...this.state.posts.filter(post => post.id !== id)]
      this.setState({ posts })
      try {
        await API.graphql(graphqlOperation(deletePost, { input: { id }}))
        console.log('post successfully deleted!')
      } catch (err) {
        console.log('error deleting post..:', err)
      }
    }
  }
  publishPost = async ({ id }) => {
    const shouldPublish = window.confirm("Are you sure you'd like to publish this post?");
    if (shouldPublish) {
      const posts = [...this.state.posts]
      const postIndex = posts.findIndex(post => post.id === id)
      posts[postIndex]['published'] = true
      console.log('posts:', posts)
      try {
        await API.graphql(graphqlOperation(updatePost, { input: { id, published: true }}))
        toast(`🔥 Post successfully published!`)
        this.setState({ posts })
      } catch (err) {
        console.log('error publishing post..:', err)
      }
    }
  }
  unPublishPost = async ({ id }) => {
    const shouldUnPublish = window.confirm("Are you sure you'd like to unpublish this post?");
    if (shouldUnPublish) {
      const posts = [...this.state.posts]
      const postIndex = posts.findIndex(post => post.id === id)
      posts[postIndex]['published'] = false
      try {
        await API.graphql(graphqlOperation(updatePost, { input: { id, published: false }}))
        toast(`Post successfully unpublished!`)
        this.setState({ posts })
      } catch (err) {
        console.log('error unpublishing post..:', err)
      }
    }
  }
  render() {
    const { viewState, isLoading } = this.state
    const highlightButton = state => css`
      color: ${state === viewState ? highlight: 'black'};
    `

    return (
        <div css={container}>
          <TitleComponent title='Admin' />
          <div css={buttonContainer}>
            <button
              onClick={() => this.toggleViewState('list')}
              css={[adminButtonStyle, highlightButton('list')]}
            >View Posts</button>
            <button
              onClick={() => this.toggleViewState('media')}
              css={[adminButtonStyle, highlightButton('media')]}
            >View Media</button>
            <button
              css={[adminButtonStyle, highlightButton('create')]}
              onClick={() => this.toggleViewState('create')}
            >New Post</button>
          </div>
          {
            isLoading && <JakobsLoader />
          }
          {
            viewState === 'list' && (
              (
                <div>
                  <PostList
                    posts={this.state.posts}
                    highlight={highlight}
                    isAdmin={true}
                    deletePost={this.deletePost}
                    publishPost={this.publishPost}
                    unPublishPost={this.unPublishPost}
                  />
                </div>
              )
            )
          }
          {
            viewState === 'create' && (
              <NewPost
                toggleViewState={this.toggleViewState}
                fetchPosts={this.fetchPosts}
              />
            )
          }
          {
            viewState === 'media' && (
              <MediaView
                toggleViewState={this.toggleViewState}
                images={this.state.images}
                addImageToState={this.addImageToState}
                imagesInUse={this.state.imagesInUse}
                imagesNotInUse={this.state.imagesNotInUse}
                removeImage={this.removeImage}
              />
            )
          }
        </div>
    )
  }
}

const buttonContainer = css`
  border-bottom: 1px solid rgba(0, 0, 0, .25);
  padding-bottom: 10px;
  margin-top: 20px;
`

const adminButtonStyle = css`
  border: none;
  outline: none;
  padding: 0;
  margin-right: 15px;
  font-family: ${fontFamily};
  opacity: .8;
  cursor: pointer;
  &:hover {
    opacity: 1;
  }
`

const adminTitle = css`
  margin-bottom: 25px;
`

const container = css`
`

export const pageQuery = graphql`
  query {
    allImageKeys {
      edges {
        node {
          data
        }
      }
    }
  }
`

export default styledAuthenticator(Admin)