import shortid from 'shortid'
import { User } from 'firebase/app'
import { allowedUrls } from '~/wildfire.config'

export interface IRoot {
  url: string
  replyCount: number
}

export interface IEntry {
  url: string
  content: string
  createdAt: string
  createdBy: User
  replyTo: string
  replyCount: number
  like: {
    'thumb-up': string[] // email
  }
}

export class FirestoreOp {
  constructor(private vm: Vue) {}

  get url() {
    const { url } = this.vm.$route.query
    const u = Array.isArray(url) ? url[0] : url
    if (!u) {
      throw new Error('URL is required')
    }

    if (!allowedUrls.some((re) => re.test(u))) {
      throw new Error('Unregistered URL')
    }

    return u
  }

  get rootId() {
    return encodeURIComponent(this.url)
  }

  get user() {
    const u = this.vm.$store.state.user
    if (!u) {
      throw new Error('User is required')
    }
    return u
  }

  get col() {
    return this.vm.$fireStore.collection('wildfire')
  }

  async getRoot(): Promise<IRoot> {
    const d = await this.col.doc(this.rootId).get()

    const data = d.data()
    if (!data) {
      await this.col.doc(this.rootId).set({
        url: this.url,
        replyCount: 0
      })

      return {
        url: this.url,
        replyCount: 0
      }
    }

    return data as IRoot
  }

  async create(entry: Omit<IEntry, 'createdBy' | 'url'>) {
    const id = shortid.generate()

    await Promise.all([
      this.col.doc(id).set({
        ...entry,
        url: this.url,
        createdBy: Object.assign({}, this.user)
      }),
      this.col
        .doc(encodeURIComponent(entry.replyTo))
        .get()
        .then((d) => {
          const data = d.data()

          if (data) {
            return this.col.doc(encodeURIComponent(entry.replyTo)).update({
              replyCount: data.replyCount + 1
            })
          } else {
            return this.col.doc(encodeURIComponent(entry.replyTo)).set({
              url: this.url,
              replyCount: 1
            })
          }
        })
    ])

    return id
  }

  async read(parent: string, items: (IEntry & { id: string })[]) {
    let c = this.col
      .where('url', '==', this.url)
      .where('replyTo', '==', parent)
      .orderBy('createdAt', 'desc')

    if (items.length > 0) {
      c = c.startAfter(items[items.length - 1].createdAt)
    }

    parent = encodeURIComponent(parent)
    let p = (await this.col.doc(parent).get()).data() as IRoot
    if (!p) {
      p = {
        url: this.url,
        replyCount: 0
      }
      await this.col.doc(parent).set(p)
    }

    return {
      data: (await c.limit(5).get()).docs.map((d) => {
        const data = d.data()
        data.id = d.id
        return data as IEntry & { id: string }
      }),
      parent: p
    }
  }

  async update(id: string, set: Partial<IEntry>) {
    id = encodeURIComponent(id)
    await this.col.doc(id).update(set)
  }

  async delete(id: string, parent: string) {
    parent = encodeURIComponent(parent)
    await Promise.all([
      this.col.doc(id).delete(),
      this.col
        .doc(parent)
        .get()
        .then((d) => {
          const replyCount = (d.data() || {}).replyCount || 0

          return this.col.doc(parent).update({
            replyCount: replyCount > 1 ? replyCount - 1 : 0
          })
        })
    ])
  }
}
