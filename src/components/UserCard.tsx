import { HomeNavigationProp, UserInfoToDelete } from "../screens/Home"
import { useNavigation } from "@react-navigation/native"
import { UserOutput } from "../types/user"
import { View, Text, StyleSheet, Button } from "react-native"

type UserCardProps = {
    user: UserOutput
    setOpenModal: React.Dispatch<React.SetStateAction<boolean>>
    enableButtons: boolean
    setUserInfoToDelete: React.Dispatch<React.SetStateAction<UserInfoToDelete | null>>
}

export default function UserCard({ user, setOpenModal, setUserInfoToDelete, enableButtons }: UserCardProps) {
    const navigation = useNavigation<HomeNavigationProp>()
    const goToUserDetails = () => navigation.navigate("DetailsUser", { id: user.id })

    return (
        <View
            style={ styles.container }
        >
            <View style={ styles.userInfo }>
                {/* <Text onPress={ goToUserDetails }>Id: { user.id }</Text> */}
                <Text onPress={ goToUserDetails }>Nome: { user.name }</Text>
                <Text onPress={ goToUserDetails }>Email: { user.email }</Text>
                {/* <Text onPress={ goToUserDetails }>Login: { user.login }</Text> */}
                {/* <Text onPress={ goToUserDetails }>Senha: { user.password }</Text> */}
                {/* <Text onPress={ goToUserDetails }>Cidade: { user.city }</Text> */}
            </View>
            <View>
                <Button title="Editar" onPress={ () => navigation.navigate("EditUser", { id: user.id })} disabled={ !enableButtons } />
                <Button title="Excluir" onPress={ () => { setOpenModal(true); setUserInfoToDelete({ id: user.id, name: user.name }) } } disabled={ !enableButtons } />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        borderColor: "black",
        borderWidth: 1,
        flexDirection: "row",
        justifyContent: "space-between"
    },
    userInfo: {
    },
})