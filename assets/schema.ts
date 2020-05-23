import shortid from 'shortid'
import { User } from 'firebase/app'
import { allowedUrls } from '~/wildfire.config'

export interface IEntry {
  id: string
  url: string
  content: string
  createdAt: string
  createdBy: Pick<User, 'email' | 'displayName'> | null
  replyTo: string
  replyCount: number
  like: {
    'thumb-up': string[] // email
  }
}

export const g = {
  fs: null as FirestoreOp | null
}

export class FirestoreOp {
  root?: IEntry & { id: string }

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

  get user() {
    const u = this.vm.$store.state.user
    if (!u) {
      throw new Error('User is required')
    }
    return u as User
  }

  get col() {
    return this.vm.$fireStore.collection('wildfire')
  }

  async getRoot(): Promise<IEntry & { id: string }> {
    if (this.root) {
      return this.root
    }

    const d = await this.col
      .where('url', '==', this.url)
      .where('replyTo', '==', '')
      .limit(1)
      .get()

    const doc = d.docs[0]
    if (!doc) {
      const id = shortid.generate()
      this.root = {
        id,
        url: this.url,
        content: '',
        createdAt: new Date().toISOString(),
        createdBy: null,
        replyTo: '',
        replyCount: 0,
        like: {
          'thumb-up': []
        }
      }
      await this.col.doc(id).set(this.root)
    } else {
      this.root = doc.data() as IEntry
    }

    return this.root
  }

  async create(entry: Omit<IEntry, 'id' | 'createdBy' | 'url'>) {
    const id = shortid.generate()

    await Promise.all([
      this.col.doc(id).set({
        ...entry,
        id,
        url: this.url,
        createdBy: {
          email: this.user.email,
          displayName: this.user.displayName
        }
      }),
      this.col
        .doc(entry.replyTo)
        .get()
        .then((d) => {
          const data = d.data()

          if (data) {
            return this.col.doc(d.id).update({
              replyCount: data.replyCount + 1
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

    let p = (await this.col.doc(parent).get()).data() as IEntry
    if (!p) {
      p = {
        id: shortid.generate(),
        url: this.url,
        content: '',
        createdAt: new Date().toISOString(),
        createdBy: null,
        replyTo: parent,
        replyCount: 1,
        like: {
          'thumb-up': []
        }
      }
      await this.col.doc(p.id).set(p)
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
    await this.col.doc(id).update(set)
  }

  async delete(id: string, parent: string) {
    await Promise.all([
      this.col.doc(id).delete(),
      this.col
        .doc(parent)
        .get()
        .then((d) => {
          if (d) {
            const replyCount = (d.data() || {}).replyCount || 0

            return this.col.doc(d.id).update({
              replyCount: replyCount > 1 ? replyCount - 1 : 0
            })
          }
        })
    ])
  }
}
