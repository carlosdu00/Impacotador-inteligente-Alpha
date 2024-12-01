export type UserInput = {
    name: string
    email: string
    login: string
    password: string
    city: string
}

export type UserOutput = {
    id: number
} & UserInput