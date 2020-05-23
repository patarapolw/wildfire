import shortid from 'shortid'
import { User } from 'firebase/app'

export interface IRoot {
  replyCount: number
}

export interface IEntry {
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

    return u
  }

  get user() {
    const u = this.vm.$fireAuth.currentUser
    if (!u) {
      throw new Error('User is required')
    }
    return u
  }

  async getRoot(): Promise<IRoot> {
    const d = await this.vm.$fireStore
      .collection(this.url)
      .doc('_root')
      .get()

    const data = d.data()
    if (!data) {
      await this.vm.$fireStore
        .collection(this.url)
        .doc('_root')
        .set({
          replyCount: 0
        })

      return {
        replyCount: 0
      }
    }

    return data as IRoot
  }

  async create(entry: Omit<IEntry, 'createdBy'>) {
    const id = shortid.generate()

    await Promise.all([
      this.vm.$fireStore
        .collection(this.url)
        .doc(id)
        .set({
          ...entry,
          createdBy: this.user
        }),
      this.vm.$fireStore
        .collection(this.url)
        .doc(entry.replyTo)
        .get()
        .then((d) => {
          return this.vm.$fireStore
            .collection(this.url)
            .doc(entry.replyTo)
            .update({
              replyCount: d.data()!.replyCount + 1
            })
        })
    ])

    return id
  }

  async read(parent: string, items: (IEntry & { id: string })[]) {
    let c = this.vm.$fireStore
      .collection(this.url)
      .where('replyTo', '==', parent)
      .orderBy('createdAt', 'desc')

    if (items.length > 0) {
      c = c.startAfter(items[items.length - 1].createdAt)
    }

    return {
      data: (await c.limit(5).get()).docs.map((d) => {
        const data = d.data()
        data.id = d.id
        return data as IEntry & { id: string }
      }),
      parent: (
        await this.vm.$fireStore
          .collection(this.url)
          .doc(parent)
          .get()
      ).data() as IEntry
    }
  }

  async update(id: string, set: Partial<IEntry>) {
    await this.vm.$fireStore
      .collection(this.url)
      .doc(id)
      .update(set)
  }

  async delete(id: string, parent: string) {
    await Promise.all([
      this.vm.$fireStore
        .collection(this.url)
        .doc(id)
        .delete(),
      this.vm.$fireStore
        .collection(this.url)
        .doc(parent)
        .get()
        .then((d) => {
          const replyCount = d.data()!.replyCount

          return this.vm.$fireStore
            .collection(this.url)
            .doc(parent)
            .update({
              replyCount: replyCount > 1 ? replyCount - 1 : 0
            })
        })
    ])
  }
}
